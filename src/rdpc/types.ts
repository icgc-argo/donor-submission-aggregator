// Run centric types:
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

// Donor centric types:
export class Analysis {
  analysisId: string;
  analysisType: string;
}

export class DonorCentricRun {
  runId: string;
  state: string;
  repository: string;
}

export class DonorDoc {
  donorId: string;
  runs: Run[];
}

export type DonorDocMap = {
  [donorId: string]: DonorDoc;
};
