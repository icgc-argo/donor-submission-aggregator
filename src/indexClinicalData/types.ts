export type DonorMolecularDataReleaseStatus =
  | "FULLY_RELEASED"
  | "PARTIALLY_RELEASED"
  | "NO_RELEASE";

export type DonorMolecularDataProcessingStatus =
  | "COMPLETE"
  | "PROCESSING"
  | "REGISTERED";

export type RdpcDonorInfo = {
  publishedNormalAnalysis: number;
  publishedTumourAnalysis: number;
  rawReadsFirstPublishedDate?: Date;

  alignmentsCompleted: number;
  alignmentsRunning: number;
  alignmentsFailed: number;

  sangerVcsCompleted: number;
  sangerVcsRunning: number;
  sangerVcsFailed: number;

  mutectCompleted: number;
  mutectRunning: number;
  mutectFailed: number;

  totalFilesCount: number;
  filesToQcCount: number;

  releaseStatus: DonorMolecularDataReleaseStatus;
  processingStatus: DonorMolecularDataProcessingStatus;
};

export type ClinicalDonorInfo = {
  submittedCoreDataPercent: number;
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
