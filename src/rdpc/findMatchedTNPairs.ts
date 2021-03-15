import _ from "lodash";
import {
  DonorData,
  SamplePair,
  StringMap,
  TumourNormalDesignationValue,
} from "rdpc/types";

// iterates over donor's DonorData and finds all the matched
// tumour/normal sample pairs. Matched samples must have the same
// experiment strategy; tumour sample uses
// matchedNormalSubmitterSampleId field as a foreign key
// to look for the matched normal sample.
export const findMatchedTNPairs = (
  map: StringMap<DonorData>
): StringMap<SamplePair[]> => {
  const donorsWithSamplePairs: StringMap<SamplePair[]> = {};

  Object.entries(map).forEach(([donorId, donorData]) => {
    const allSamplePairs: SamplePair[] = [];
    donorData.samplePairs.forEach((currentSample) => {
      if (currentSample.tumourSample) {
        const matchedNormalSample = donorData.samplePairs.filter(
          (sample) =>
            sample.normalSample &&
            sample.normalSample.tumourNormalDesignation ===
              TumourNormalDesignationValue.Normal &&
            !sample.tumourSample &&
            sample.normalSample.experimentStrategy ===
              currentSample.tumourSample?.experimentStrategy &&
            sample.normalSample.submitterSampleId ===
              currentSample.tumourSample?.matchedNormalSubmitterSampleId
        );

        matchedNormalSample.forEach((matched) => {
          const samplePair = {
            normalSample: matched.normalSample,
            tumourSample: currentSample.tumourSample,
            firstPublishedAt: determinSamplePairFirstPublishedDate(
              matched,
              currentSample
            ),
          };
          allSamplePairs.push(samplePair);
        });
      }
    });

    if (donorsWithSamplePairs[donorId]) {
      donorsWithSamplePairs[donorId] = [
        ...donorsWithSamplePairs[donorId],
        ...allSamplePairs,
      ];
    } else {
      donorsWithSamplePairs[donorId] = allSamplePairs;
    }
  });

  return donorsWithSamplePairs;
};

// returns the most recent first published date as the earliest available sample pair published date
const determinSamplePairFirstPublishedDate = (
  normal: SamplePair,
  tumour: SamplePair
): number => {
  if (
    normal.normalSample &&
    !normal.tumourSample &&
    tumour.tumourSample &&
    !tumour.normalSample
  ) {
    return Math.max(
      Number(normal.normalSample.firstPublishedAt),
      Number(tumour.tumourSample.firstPublishedAt)
    );
  } else {
    throw new Error(`determinFirstPublishedDatePerPair: Cannot determin first published date for sample pairs,
        either tumour or normal sample is missing in SamplePair.`);
  }
};

// Iterates over donor's T/N sample pairs and
// returns the first available pair
export const findEarliestAvailableSamplePair = (
  donorsWithMatchedPairs: StringMap<SamplePair[]>
): StringMap<SamplePair> => {
  const result: StringMap<SamplePair> = {};
  Object.entries(donorsWithMatchedPairs).forEach(([donorId, samplePairs]) => {
    const sorted = _.sortBy(samplePairs, (pair) => pair.firstPublishedAt);
    const earliestPair = _.head(sorted);
    if (earliestPair) {
      result[donorId] = earliestPair;
    } else {
      result[donorId] = { firstPublishedAt: 0 };
    }
  });
  return result;
};
