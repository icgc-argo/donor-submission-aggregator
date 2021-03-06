import fetchAnalyses from "rdpc/query/fetchAnalyses";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import fetchVariantCallingAnalyses from "rdpc/query/fetchVariantCallingAnalyses";
import {
  seqAlignmentAnalyses_mutect,
  seqAlignmentAnalyses_sanger,
  seqExpAnalyses,
  seqExpAnalysesWithSpecimens,
  variantCallingAnalyses,
} from "rdpc/test/fixtures/integrationTest/mockAnalyses";
import { Analysis, AnalysisType } from "rdpc/types";

export const mockVariantCallingFetcher: typeof fetchVariantCallingAnalyses = ({
  studyId,
  rdpcUrl,
  from,
  size,
  egoJwtManager,
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
  egoJwtManager,
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
  isMutect,
  from,
  size,
  egoJwtManager,
  donorId,
}): Promise<Analysis[]> => {
  const matchesDonorId = (donor: any) =>
    donorId ? donor.donorId === donorId : true;
  return Promise.resolve(
    analysisType === AnalysisType.SEQ_EXPERIMENT
      ? seqExpAnalyses
          .filter((analysis) => analysis.donors.some(matchesDonorId))
          .slice(from, from + size)
      : isMutect
      ? seqAlignmentAnalyses_mutect
          .filter((analysis) => analysis.donors.some(matchesDonorId))
          .slice(from, from + size)
      : seqAlignmentAnalyses_sanger
          .filter((analysis) => analysis.donors.some(matchesDonorId))
          .slice(from, from + size)
  );
};
