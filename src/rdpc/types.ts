// Run centric types:
export class Runs {
  runs: Run[];
}

export class Run {
  runId: string;
  state: string;
  repository: string;
  inputAnalyses: InputAnalysis[];
}

export class InputAnalysis {
  analysisId: string;
  analysisType: string;
  donors: Donor[];
}

export class Donor {
  donorId: string;
}

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

export class SimpleRun {
  runId: string;
  state: string;
  repository: string;
}

export class DonorDoc {
  donorId: string;
  runs: SimpleRun[];
}

export class DonorDocMap {
  [donorId: string]: DonorDoc;
}
