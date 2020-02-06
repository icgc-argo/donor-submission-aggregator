export type EsDonorDocument = {
  programId: string;

  validWithCurrentDictionary: boolean;

  releaseStatus: string;

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

  processingStatus: string;

  updatedAt: Date;
  createdAt: Date;
};
