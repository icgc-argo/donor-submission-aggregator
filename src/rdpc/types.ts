import { RdpcDonorInfo } from "indexClinicalData/types";
export interface Analysis {
  analysisId: string;
  analysisType: string;
  firstPublishedAt: string;
  donors: Donor[];
  runs: Run[];
  experiment: Experiment;
}
export interface Experiment {
  experimental_strategy: string;
  library_strategy: string;
}
export interface Donor {
  donorId: string;
  specimens: Specimen[];
}
export interface SimpleAnalysis {
  analysisId: string;
}
export interface Specimen {
  specimenId: string;
  tumourNormalDesignation: TumourNormalDesignationValue;
  samples: Sample[];
}
export interface Sample {
  submitterSampleId: string;
  matchedNormalSubmitterSampleId: string | null;
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
  producedAnalyses: SimpleAnalysis[];
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
export interface RunWithFirstPublishedDate {
  run: Run[];
  firstPublishedAt: Date;
}
export interface RunsByAnalysesByDonors {
  [donorId: string]: RunsByInputAnalyses;
}

export interface DonorInfoMap {
  [donorId: string]: RdpcDonorInfo;
}
export interface DonorData {
  donorId: string;
  specimen: Specimen[];
  samplePairs: SamplePair[];
}

export interface StringMap<T> {
  [key: string]: T;
}
export interface SpecimensByDonors {
  [donorId: string]: Specimen[];
}
export interface SamplePair {
  firstPublishedAt: number;
  normalSample?: FlattenedSample;
  tumourSample?: FlattenedSample;
}
export interface FlattenedSample {
  specimenId: string;
  tumourNormalDesignation: TumourNormalDesignationValue;
  submitterSampleId: string;
  matchedNormalSubmitterSampleId: string;
  firstPublishedAt: string;
  experimentStrategy: string;
}
