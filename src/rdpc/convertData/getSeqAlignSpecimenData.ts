import { FirstPublishedDateFields } from "indexClinicalData/types";
import { mergeDonorInfo } from "rdpc/analysesProcessor";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import {
  getAllMergedDonorWithSpecimens,
  getFirstPublishedDate,
} from "../analysesSpecimenProcessor";
import {
  findEarliestAvailableSamplePair,
  findMatchedTNPairs,
  getRnaSampleFirstPublishedDate,
} from "../findMatchedTNPairs";
import { DonorInfoMap } from "../types";
import { StreamState } from "./type";

export const getSeqAlignSpecimenData = async (
  studyId: string,
  url: string,
  analysisType: string,
  analysesFetcher: typeof fetchAnalysesWithSpecimens,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const mergedDonors = await getAllMergedDonorWithSpecimens({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    config,
    analysesFetcher,
  });

  const matchedSamplePairs = findMatchedTNPairs(mergedDonors);

  const earliestPair = findEarliestAvailableSamplePair(matchedSamplePairs);

  const rdpcInfo_rnaAlignmentFirstPublishedDate = getRnaSampleFirstPublishedDate(
    mergedDonors,
    FirstPublishedDateFields.RNA_ALIGNMENT_FIRST_PUBLISHED_DATE
  );

  const rdpcInfo_dnaAlignmentDate = getFirstPublishedDate(
    earliestPair,
    FirstPublishedDateFields.ALIGNMENT_FIRST_PUBLISHED_DATE
  );

  const result = mergeDonorInfo(
    rdpcInfo_dnaAlignmentDate,
    rdpcInfo_rnaAlignmentFirstPublishedDate
  );

  return result;
};
