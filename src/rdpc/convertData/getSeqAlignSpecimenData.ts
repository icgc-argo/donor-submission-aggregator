import { FirstPublishedDateFields } from "indexClinicalData/types";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import {
  getAllMergedDonorWithSpecimens,
  getFirstPublishedDate,
} from "../analysesSpecimenProcessor";
import {
  findEarliestAvailableSamplePair,
  findMatchedTNPairs,
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

  const matchedSamplePairs_seqAlign = findMatchedTNPairs(mergedDonors);
  const earliestPair_seqAlign = findEarliestAvailableSamplePair(
    matchedSamplePairs_seqAlign
  );
  const rdpcInfo_alignmentDate = getFirstPublishedDate(
    earliestPair_seqAlign,
    FirstPublishedDateFields.ALIGNMENT_FIRST_PUBLISHED_DATE
  );

  return rdpcInfo_alignmentDate;
};
