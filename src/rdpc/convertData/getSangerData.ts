import { EgoJwtManager } from "auth";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import { countVCRunState, getAllMergedDonor } from "../analysesProcessor";
import { DonorInfoMap } from "../types";
import { StreamState } from "./type";

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
