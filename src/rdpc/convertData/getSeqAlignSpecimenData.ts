import { EgoJwtManager } from "auth";
import { FirstPublishedDateFields } from "indexClinicalData/types";
import {
  getAllMergedDonorWithSpecimens,
  getFirstPublishedDate,
} from "../analysesSpecimenProcessor";
import fetchAnalysesWithSpecimens from "../fetchAnalysesWithSpecimens";
import {
  findEarliestAvailableSamplePair,
  findMatchedTNPairs,
} from "../findMatchedTNPairs";
import { DonorInfoMap } from "../types";

export const getSeqAlignSpecimenData = async (
  studyId: string,
  url: string,
  analysisType: string,
  egoJwtManager: EgoJwtManager,
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
    egoJwtManager,
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

type StreamState = {
  currentPage: number;
};
