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
      if (currentSample.tumourSample && !currentSample.normalSample) {
        const matchedNormalSample = donorData.samplePairs.filter(
          (sample) =>
            sample.normalSample &&
            sample.normalSample.tumourNormalDesignation ===
              TumourNormalDesignationValue.Normal &&
            !sample.tumourSample &&
            sample.normalSample.experimentStrategy ===
              currentSample.tumourSample?.experimentStrategy &&
            sample.normalSample.submitterSampleId ===
              currentSample.tumourSample.matchedNormalSubmitterSampleId
        );

        matchedNormalSample.forEach((matched) => {
          if (
            matched.normalSample &&
            !matched.tumourSample &&
            currentSample.tumourSample &&
            !currentSample.normalSample
          ) {
            const samplePair = {
              normalSample: matched.normalSample,
              tumourSample: currentSample.tumourSample,
              firstPublishedAt: Math.max(
                Number(matched.normalSample.firstPublishedAt),
                Number(currentSample.tumourSample.firstPublishedAt)
              ),
            };
            allSamplePairs.push(samplePair);
          }
        });
      }
    });

    donorsWithSamplePairs[donorId] = (
      donorsWithSamplePairs[donorId] || []
    ).concat(allSamplePairs);
  });

  return donorsWithSamplePairs;
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
