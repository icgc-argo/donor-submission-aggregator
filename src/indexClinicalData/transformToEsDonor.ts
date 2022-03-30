import { DonorMolecularDataReleaseStatus } from "files/types";
import { ClinicalDonor } from "../external/clinical/types";
import { ClinicalDonorInfo, EsDonorDocument, RdpcDonorInfo } from "./types";

const defaultRDPCInfo: RdpcDonorInfo = {
  rnaPublishedNormalAnalysis: 0,
  rnaPublishedTumourAnalysis: 0,

  publishedNormalAnalysis: 0,
  publishedTumourAnalysis: 0,

  alignmentsCompleted: 0,
  alignmentsRunning: 0,
  alignmentsFailed: 0,

  sangerVcsCompleted: 0,
  sangerVcsRunning: 0,
  sangerVcsFailed: 0,

  mutectCompleted: 0,
  mutectRunning: 0,
  mutectFailed: 0,

  openAccessCompleted: 0,
  openAccessRunning: 0,
  openAccessFailed: 0,

  totalFilesCount: 0,
  filesToQcCount: 0,

  releaseStatus: DonorMolecularDataReleaseStatus.NO_RELEASE,
  processingStatus: "REGISTERED",
};

export default (
  donor: ClinicalDonor,
  existingEsData?: EsDonorDocument
): EsDonorDocument => {
  const submittedExtendedDataPercent = 0; // this calculation is not yet defined

  const clinicalData: ClinicalDonorInfo = {
    validWithCurrentDictionary: donor.schemaMetadata.isValid,
    donorId: donor.donorId,
    submitterDonorId: donor.submitterId,
    programId: donor.programId,

    submittedCoreDataPercent:
      donor.completionStats?.coreCompletionPercentage || 0,

    submittedExtendedDataPercent: submittedExtendedDataPercent,

    registeredNormalSamples: donor.specimens
      .filter((specimen) => specimen.tumourNormalDesignation === "Normal")
      .reduce((sum, specimen) => sum + specimen.samples.length, 0),

    registeredTumourSamples: donor.specimens
      .filter((specimen) => specimen.tumourNormalDesignation === "Tumour")
      .reduce((sum, specimen) => sum + specimen.samples.length, 0),

    updatedAt: new Date(donor.updatedAt),
    createdAt: new Date(donor.createdAt),
  };

  if (donor.completionStats?.coreCompletionDate) {
    clinicalData.coreCompletionDate = new Date(
      donor.completionStats.coreCompletionDate
    );
  }

  return {
    ...defaultRDPCInfo,
    ...(existingEsData || {}),
    ...clinicalData,
  };
};
