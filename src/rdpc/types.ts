import { RdpcDonorInfo } from "indexClinicalData/types";

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

export type DonorRunStateMap = {
  [donorId: string]: RdpcDonorInfo;
};
