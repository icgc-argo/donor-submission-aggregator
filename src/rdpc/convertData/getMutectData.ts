import { EgoJwtManager } from "auth";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import { countMutectRunState, getAllMergedDonor } from "../analysesProcessor";
import { AnalysisType, DonorInfoMap, WorkflowName } from "../types";
import { StreamState } from "./type";

export const getMutectData = async (
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
  const mergedMutectDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    workflowName: workflowName,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor_mutect = countMutectRunState(mergedMutectDonors);
  return rdpcInfoByDonor_mutect;
};
