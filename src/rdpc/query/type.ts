export type AnalysisFilterQueryVar = {
  analysisType?: string;
  analysisState?: string;
  studyId?: string;
  donorId?: string;
};

export type PageQueryVar = {
  from: number;
  size: number;
};

export type QueryVariable = {
  analysisFilter: AnalysisFilterQueryVar;
  analysisPage: PageQueryVar;
  workflowRepoUrl?: string;
};

export const retryConfig = {
  factor: 2,
  retries: 5,
  minTimeout: 10,
  maxTimeout: Infinity,
};
