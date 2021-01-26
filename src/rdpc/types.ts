import { RdpcDonorInfo } from "indexClinicalData/types";

export interface Analysis {
  analysisId: string;
  analysisType: string;
  donors: Donor[];
  runs: Run[];
}
export interface AnalysisWithSpecimens {
  analysisId: string;
  analysisType: AnalysisType;
  analysisState: AnalysisState;
  donors: DonorWithSpecimens[];
}
export interface Donor {
  donorId: string;
  specimens?: Specimen[];
}
export interface SimpleAnalysis {
  analysisId: string;
}

export interface DonorWithSpecimens {
  donorId: string;
  specimens: Specimen[];
}

export interface Specimen {
  specimenId: string;
  tumourNormalDesignation: TumourNormalDesignationValue;
}

export enum TumourNormalDesignationValue {
  Normal = "Normal",
  Tumour = "Tumour",
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

export interface DonorInfoMap {
  [donorId: string]: RdpcDonorInfo;
}

export interface SpecimensByDonors {
  [donorId: string]: Specimen[];
}
