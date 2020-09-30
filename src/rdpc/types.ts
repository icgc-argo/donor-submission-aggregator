export type Runs = {
  runs: Run[];
};

export type Run = {
  runId: string;
  state: string;
  repository: string;
  inputAnalyses: InputAnalysis[];
};

export type InputAnalysis = {
  analysisId: string;
  analysisType: string;
  donors: Donor[];
};

export type Donor = {
  donorId: string;
};
