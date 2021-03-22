import { EgoJwtManager } from "auth";
import {
  countAlignmentRunState,
  getAllMergedDonor,
} from "../analysesProcessor";
import fetchAnalyses from "../fetchAnalyses";
import { DonorInfoMap } from "../types";
import { StreamState } from "./type";

export const getAlignmentData = async (
  studyId: string,
  url: string,
  analysisType: string,
  isMutect: boolean,
  egoJwtManager: EgoJwtManager,
  analysesFetcher: typeof fetchAnalyses,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const mergedAlignmenttDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    isMutect: isMutect,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor = countAlignmentRunState(mergedAlignmenttDonors);
  return rdpcInfoByDonor;
};
