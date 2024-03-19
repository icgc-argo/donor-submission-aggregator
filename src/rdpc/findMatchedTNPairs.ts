import { FirstPublishedDateFields } from 'indexClinicalData/types';
import _ from 'lodash';
import {
	DNA_SAMPLE_TYPE_KEYWORD,
	DonorData,
	DonorInfoMap,
	RNA_SAMPLE_TYPE_KEYWORD,
	SamplePair,
	StringMap,
	TumourNormalDesignationValue,
} from 'rdpc/types';
import { initializeRdpcInfo } from './analysesProcessor';

/**
iterates over donor's DonorData and finds all the matched
tumour/normal sample pairs by donor Id.
Matched samples must meet these conditions:
- have the same experiment strategy;
- tumour sample's matchedNormalSubmitterSampleId must be the same as normal sample's submitterSampleId;
- have the same DNA sample type.
This function only returns matched DNA sample pairs.
*/
export const findMatchedTNPairs = (map: StringMap<DonorData>): StringMap<SamplePair[]> => {
	const donorsWithSamplePairs: StringMap<SamplePair[]> = {};

	Object.entries(map).forEach(([donorId, donorData]) => {
		const allSamplePairs: SamplePair[] = [];
		donorData.samplePairs.forEach((currentSample) => {
			if (
				currentSample.tumourSample &&
				!currentSample.normalSample &&
				currentSample.tumourSample.sampleType.toUpperCase().includes(DNA_SAMPLE_TYPE_KEYWORD)
			) {
				const matchedNormalSample = donorData.samplePairs.filter(
					(sample) =>
						sample.normalSample &&
						sample.normalSample.tumourNormalDesignation === TumourNormalDesignationValue.Normal &&
						!sample.tumourSample &&
						sample.normalSample.experimentStrategy ===
							currentSample.tumourSample?.experimentStrategy &&
						sample.normalSample.submitterSampleId ===
							currentSample.tumourSample.matchedNormalSubmitterSampleId &&
						sample.normalSample.sampleType === currentSample.tumourSample.sampleType,
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
								Number(currentSample.tumourSample.firstPublishedAt),
							),
						};
						allSamplePairs.push(samplePair);
					}
				});
			}
		});

		donorsWithSamplePairs[donorId] = (donorsWithSamplePairs[donorId] || []).concat(allSamplePairs);
	});

	return donorsWithSamplePairs;
};

// Iterates over donor's T/N sample pairs and
// returns the first available pair
export const findEarliestAvailableSamplePair = (
	donorsWithMatchedPairs: StringMap<SamplePair[]>,
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

export const countMatchedSamplePairs = (
	samplePairsByDonorId: StringMap<SamplePair[]>,
): DonorInfoMap => {
	const donorInfo: DonorInfoMap = {};

	Object.entries(samplePairsByDonorId).forEach(([donorId, samplePairs]) => {
		const numberOfPairs = samplePairs.length;
		initializeRdpcInfo(donorInfo, donorId);
		donorInfo[donorId].matchedTNPairsDNA = numberOfPairs;
	});
	return donorInfo;
};

// This function finds the first published date for RNA tumour raw reads and
// RNA tumour alignments. Normal RNA samples are ignored.
export const getRnaSampleFirstPublishedDate = (
	map: StringMap<DonorData>,
	field: string,
): DonorInfoMap => {
	const result: DonorInfoMap = {};

	Object.entries(map).forEach(([donorId, donorData]) => {
		// filter out DNA samples and only keep RNA tumour samples:
		const rnaTumours: SamplePair[] = donorData.samplePairs.filter((sample) =>
			sample.tumourSample?.sampleType.toUpperCase().includes(RNA_SAMPLE_TYPE_KEYWORD),
		);

		const sorted = _.sortBy(rnaTumours, (sample) => sample.firstPublishedAt);
		const earliest = _.head(sorted);
		initializeRdpcInfo(result, donorId);

		if (earliest) {
			field === FirstPublishedDateFields.RNA_ALIGNMENT_FIRST_PUBLISHED_DATE
				? (result[donorId].rnaAlignmentFirstPublishedDate = new Date(earliest.firstPublishedAt))
				: (result[donorId].rnaRawReadsFirstPublishedDate = new Date(earliest.firstPublishedAt));
		}
	});
	return result;
};
