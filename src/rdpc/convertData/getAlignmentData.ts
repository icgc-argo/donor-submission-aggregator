import fetchAnalyses from "rdpc/query/fetchAnalyses";
import {
  countAlignmentRunState,
  getAllMergedDonor,
} from "../analysesProcessor";
import { AnalysisType, DonorInfoMap, WorkflowName } from "../types";
import { StreamState } from "./type";

export const getAlignmentData = async (
  studyId: string,
  url: string,
  analysisType: AnalysisType,
  workflowName: WorkflowName,
  analysesFetcher: typeof fetchAnalyses,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const mergedAlignmentDonors = await getAllMergedDonor({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    workflowName: workflowName,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor_alignment = countAlignmentRunState(
    mergedAlignmentDonors
  );
  return rdpcInfoByDonor_alignment;
};
