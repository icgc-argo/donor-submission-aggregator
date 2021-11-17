import { EgoJwtManager } from "auth";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import { countVCRunState, getAllMergedDonor } from "../analysesProcessor";
import { AnalysisType, DonorInfoMap, WorkflowName } from "../types";
import { StreamState } from "./type";

export const getSangerData = async (
  studyId: string,
  url: string,
  analysisType: AnalysisType,
  workflowName: WorkflowName,
  egoJwtManager: EgoJwtManager,
  analysesFetcher: typeof fetchAnalyses,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const mergedSangerDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    workflowName: workflowName,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor_sanger = countVCRunState(mergedSangerDonors);
  return rdpcInfoByDonor_sanger;
};
