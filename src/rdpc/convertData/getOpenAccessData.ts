import { EgoJwtManager } from "auth";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import {
  countOpenAccessRunState,
  getAllMergedDonor,
} from "../analysesProcessor";
import { DonorInfoMap } from "../types";
import { StreamState } from "./type";

export const getOpenAccessData = async (
  studyId: string,
  url: string,
  analysisType: string,
  workflowName: string,
  egoJwtManager: EgoJwtManager,
  analysesFetcher: typeof fetchAnalyses,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const mergedOpenAccessDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    workflowName: workflowName,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor_openAccess = countOpenAccessRunState(
    mergedOpenAccessDonors
  );
  return rdpcInfoByDonor_openAccess;
};
