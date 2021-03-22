import { EgoJwtManager } from "auth";
import { countVCRunState, getAllMergedDonor } from "../analysesProcessor";
import fetchAnalyses from "../fetchAnalyses";
import { DonorInfoMap } from "../types";

export const getSangerData = async (
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
  const mergedMutectDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    isMutect: isMutect,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor = countVCRunState(mergedMutectDonors);
  return rdpcInfoByDonor;
};

type StreamState = {
  currentPage: number;
};
