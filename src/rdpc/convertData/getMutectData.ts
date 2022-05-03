import fetchAnalyses from "rdpc/query/fetchAnalyses";
import { countMutectRunState, getAllMergedDonor } from "../analysesProcessor";
import { AnalysisType, DonorInfoMap, WorkflowName } from "../types";
import { StreamState } from "./type";

export const getMutectData = async (
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
  const mergedMutectDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    workflowName: workflowName,
    config,
    analysesFetcher,
    isRNA,
  });

  const rdpcInfoByDonor_mutect = countMutectRunState(mergedMutectDonors);
  return rdpcInfoByDonor_mutect;
};
