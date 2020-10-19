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
  sessionId: string;
  repository: string;
  inputAnalyses?: SimpleAnalysis[];
}

export interface SessionRunMap {
  [sessionId: string]: Run[];
}

export interface DonorDocMap {
  [donorId: string]: SessionRunMap;
}

export interface DonorRunStateMap {
  [donorId: string]: RdpcDonorInfo;
}
