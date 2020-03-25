export type DonorMolecularDataReleaseStatus =
  | "FULLY_RELEASED"
  | "PARTIALLY_RELEASED"
  | "NO_RELEASE";

export type DonorMolecularDataProcessingStatus =
  | "COMPLETE"
  | "PROCESSING"
  | "REGISTERED";

export type EsDonorDocument = {
  programId: string;

  validWithCurrentDictionary: boolean;

  releaseStatus: DonorMolecularDataReleaseStatus;

  donorId: number;
  submitterDonorId: string;

  submittedCoreDataPercent: number;

  submittedExtendedDataPercent: number;

  registeredNormalSamples: number;
  registeredTumourSamples: number;

  publishedNormalAnalysis: number;
  publishedTumourAnalysis: number;

  alignmentsCompleted: number;
  alignmentsRunning: number;
  alignmentsFailed: number;

  sangerVcsCompleted: number;
  sangerVcsRunning: number;
  sangerVcsFailed: number;

  processingStatus: DonorMolecularDataProcessingStatus;

  filesCount: number;
  filesToQc: number;

  updatedAt: Date;
  createdAt: Date;
};
