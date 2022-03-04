import fetchAnalyses from "rdpc/query/fetchAnalyses";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import fetchVariantCallingAnalyses from "rdpc/query/fetchVariantCallingAnalyses";
import {
  seqAlignmentAnalyses_mutect,
  seqAlignmentAnalyses_sanger,
  seqExpAnalyses,
  seqExpAnalysesWithSpecimens,
  variantCallingAnalyses,
  variantCallingAnalyses_open,
} from "rdpc/test/fixtures/integrationTest/mockAnalyses";
import { Analysis, AnalysisType, WorkflowName } from "rdpc/types";

export const mockVariantCallingFetcher: typeof fetchVariantCallingAnalyses = ({
  studyId,
  rdpcUrl,
  from,
  size,
  donorId,
}): Promise<Analysis[]> => {
  const matchesDonorId = (donor: any) =>
    donorId ? donor.donorId === donorId : true;
  return Promise.resolve(
    variantCallingAnalyses
      .filter((analysis) => analysis.donors.some(matchesDonorId))
      .slice(from, from + size)
  );
};

export const mockAnalysesWithSpecimensFetcher: typeof fetchAnalysesWithSpecimens = async ({
  studyId,
  rdpcUrl,
  from,
  size,
  donorId,
}): Promise<Analysis[]> => {
  const matchesDonorId = (donor: any) =>
    donorId ? donor.donorId === donorId : true;
  return Promise.resolve(
    seqExpAnalysesWithSpecimens
      .filter((analysis) => analysis.donors.some(matchesDonorId))
      .slice(from, from + size)
  );
};

export const mockAnalysisFetcher: typeof fetchAnalyses = async ({
  studyId,
  rdpcUrl,
  analysisType,
  workflowName,
  from,
  size,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  analysisType: string;
  workflowName: WorkflowName;
  from: number;
  size: number;
  donorId?: string;
}): Promise<Analysis[]> => {
  const matchesDonorId = (donor: any) =>
    donorId ? donor.donorId === donorId : true;

  let analysis: Analysis[] = [];
  if (analysisType === AnalysisType.SEQ_EXPERIMENT) {
    analysis = seqExpAnalyses
      .filter((analysis) => analysis.donors.some(matchesDonorId))
      .slice(from, from + size);
  } else {
    switch (workflowName) {
      case WorkflowName.MUTECT:
        analysis = seqAlignmentAnalyses_mutect
          .filter((analysis) => analysis.donors.some(matchesDonorId))
          .slice(from, from + size);
        break;
      case WorkflowName.SANGER:
        analysis = seqAlignmentAnalyses_sanger
          .filter((analysis) => analysis.donors.some(matchesDonorId))
          .slice(from, from + size);
        break;
      case WorkflowName.OPEN_ACCESS:
        analysis = variantCallingAnalyses_open
          .filter((analysis) => analysis.donors.some(matchesDonorId))
          .slice(from, from + size);
        break;
      default:
        break;
    }
  }

  return Promise.resolve(analysis);
};
