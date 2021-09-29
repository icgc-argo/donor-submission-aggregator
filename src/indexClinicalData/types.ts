import { DonorMolecularDataReleaseStatus } from "files/types";

export type DonorMolecularDataProcessingStatus =
  | "COMPLETE"
  | "PROCESSING"
  | "REGISTERED";

export enum FirstPublishedDateFields {
  RAW_READS_FIRST_PUBLISHED_DATE = "rawReadsFirstPublishedDate",
  ALIGNMENT_FIRST_PUBLISHED_DATE = "alignmentFirstPublishedDate",
}

export type RdpcDonorInfo = {
  publishedNormalAnalysis: number;
  publishedTumourAnalysis: number;
  rawReadsFirstPublishedDate?: Date;

  alignmentsCompleted: number;
  alignmentsRunning: number;
  alignmentsFailed: number;
  alignmentFirstPublishedDate?: Date;

  sangerVcsCompleted: number;
  sangerVcsRunning: number;
  sangerVcsFailed: number;
  sangerVcsFirstPublishedDate?: Date;

  mutectCompleted: number;
  mutectRunning: number;
  mutectFailed: number;
  mutectFirstPublishedDate?: Date;

  totalFilesCount: number;
  filesToQcCount: number;

  releaseStatus: DonorMolecularDataReleaseStatus;
  processingStatus: DonorMolecularDataProcessingStatus;
};

export type ClinicalDonorInfo = {
  submittedCoreDataPercent: number;
  coreCompletionDate?: Date;
  submittedExtendedDataPercent: number;
  validWithCurrentDictionary: boolean;
  donorId: string;
  submitterDonorId: string;
  programId: string;
  registeredNormalSamples: number;
  registeredTumourSamples: number;
  updatedAt: Date;
  createdAt: Date;
};
export type EsDonorDocument = RdpcDonorInfo & ClinicalDonorInfo;

export type EsHit = {
  _index: string;
  _type: string;
  _id: string;
  _score: number;
  _source: EsDonorDocument;
};
