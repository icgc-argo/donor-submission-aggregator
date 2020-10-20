import { RdpcDonorInfo } from "indexClinicalData/types";

export interface Analysis {
  analysisId: string;
  analysisType: string;
  donors: Donor[];
  runs: Run[];
}

export interface SimpleAnalysis {
  analysisId: string;
}

export interface Donor {
  donorId: string;
}

export interface Run {
  runId: string;
  state: string;
  repository: string;
  inputAnalyses: SimpleAnalysis[];
}

export interface InputAnalysesRunMap {
  [inputAnalyses: string]: Run[];
}

export interface DonorDocMap {
  [donorId: string]: InputAnalysesRunMap;
}

export interface DonorRunStateMap {
  [donorId: string]: RdpcDonorInfo;
}
