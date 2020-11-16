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
  state: RunState;
  repository: string;
  inputAnalyses: SimpleAnalysis[];
}

export enum RunState {
  COMPLETE = "COMPLETE",
  RUNNING = "RUNNING",
  EXECUTOR_ERROR = "EXECUTOR_ERROR",
}

export enum AnalysisType {
  SEQ_ALIGNMENT = "sequencing_alignment",
  SEQ_EXPERIMENT = "sequencing_experiment",
}

export enum AnalysisState {
  PUBLISHED = "PUBLISHED",
  UNPUBLISHED = "UNPUBLISHED",
}

export interface RunsByInputAnalyses {
  [inputAnalyses: string]: Run[];
}

export interface RunsByAnalysesByDonors {
  [donorId: string]: RunsByInputAnalyses;
}

export interface DonorRunStateMap {
  [donorId: string]: RdpcDonorInfo;
}
