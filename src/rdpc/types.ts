import { RdpcDonorInfo } from "indexClinicalData/types";
export interface Analysis {
  analysisId: string;
  analysisType: string;
  firstPublishedAt: string;
  donors: Donor[];
  runs: Run[];
  experiment: Experiment;
  workflow: Workflow;
}
export interface Workflow {
  workflowName: string;
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
  sampleType: string;
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
  VARIANT_CALLING = "variant_calling",
  VARIANT_PROCESSING = "variant_processing",
}

export enum AnalysisState {
  PUBLISHED = "PUBLISHED",
  UNPUBLISHED = "UNPUBLISHED",
  SUPPRESSED = "SUPPRESSED",
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
  sampleType: string;
}

export interface WorkflowInfo {
  sangerVC: WorkflowData[];
  mutect: WorkflowData[];
  openAccess: WorkflowData[];
}

export interface WorkflowData {
  analysisId: string;
  workflowName: string;
  firstPublishedAt: string;
}

export enum WorkflowName {
  ALIGNMENT = "alignment",
  SANGER = "sanger",
  MUTECT = "mutect2",
  OPEN_ACCESS = "open",
}

export const DNA_SAMPLE_TYPE_KEYWORD = "DNA";
export const RNA_SAMPLE_TYPE_KEYWORD = "RNA";
