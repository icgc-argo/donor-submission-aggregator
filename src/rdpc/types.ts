export class RDPCAnalyses {
  sequencingExperimentAnalyses: Analysis[];
  sequencingAlignmentAnalyses: Analysis[];
}

export class Analysis {
  analysisId: string;
  analysisType: string;
  donors: Donor[];
  runs: Run[];
}

export class SimpleAnalysis {
  analysisId: string;
}

export class Donor {
  donorId: string;
}

export class Run {
  runId: string;
  state: string;
  repository: string;
  inputAnalyses?: SimpleAnalysis[];
}

export class DonorDoc {
  donorId: string;
  runs: Run[];
}

export class DonorDocMap {
  [donorId: string]: DonorDoc;
}

export class RunState {
  alignmentsCompleted: number = 0;
  alignmentsRunning: number = 0;
  alignmentsFailed: number = 0;
  sangerVcsCompleted: number = 0;
  sangerVcsRunning: number = 0;
  sangerVcsFailed: number = 0;
}

export class DonorRunStateMap {
  [donorId: string]: RunState;
}
