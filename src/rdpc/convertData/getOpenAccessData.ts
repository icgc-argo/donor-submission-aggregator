import fetchAnalyses from "rdpc/query/fetchAnalyses";
import {
  countOpenAccessRunState,
  getAllMergedDonor,
} from "../analysesProcessor";
import { AnalysisType, DonorInfoMap, WorkflowName } from "../types";
import { StreamState } from "./type";

export const getOpenAccessData = async (
  studyId: string,
  url: string,
  analysisType: AnalysisType,
  workflowName: WorkflowName,
  analysesFetcher: typeof fetchAnalyses,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  isRNA: boolean,
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const mergedOpenAccessDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    workflowName: workflowName,
    config,
    analysesFetcher,
    isRNA,
  });

  const rdpcInfoByDonor_openAccess = countOpenAccessRunState(
    mergedOpenAccessDonors
  );
  return rdpcInfoByDonor_openAccess;
};
