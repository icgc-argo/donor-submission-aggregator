import { MongoDonorDocument } from "donorModel";
import { EsDonorDocument } from "./types";

export default async (
  mongoDoc: MongoDonorDocument
): Promise<EsDonorDocument> => {
  const expectedCoreFields =
    mongoDoc.aggregatedInfoStats?.expectedCoreFields || 0;
  const submittedCoreFields =
    mongoDoc.aggregatedInfoStats?.submittedCoreFields || 0;

  const expectedExtendedFields =
    mongoDoc.aggregatedInfoStats?.expectedExtendedFields || 0;
  const submittedExtendedFields =
    mongoDoc.aggregatedInfoStats?.submittedExtendedFields || 0;

  return {
    validWithCurrentDictionary: mongoDoc.schemaMetadata.isValid,

    releaseStatus: "NO_RELEASE",

    donorId: mongoDoc.donorId,
    submitterDonorId: mongoDoc.submitterId,
    programId: mongoDoc.programId,

    submittedCoreDataPercent:
      expectedCoreFields > 0 ? submittedCoreFields / expectedCoreFields : 0,

    submittedExtendedDataPercent:
      expectedExtendedFields > 0
        ? submittedExtendedFields / expectedExtendedFields
        : 0,

    registeredNormalSamples: mongoDoc.specimens
      .filter(specimen => specimen.tumourNormalDesignation === "Normal")
      .reduce((sum, specimen) => sum + specimen.samples.length, 0),

    registeredTumourSamples: mongoDoc.specimens
      .filter(specimen => specimen.tumourNormalDesignation === "Tumour")
      .reduce((sum, specimen) => sum + specimen.samples.length, 0),

    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,

    alignmentsCompleted: 0,
    alignmentsRunning: 0,
    alignmentsFailed: 0,

    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,

    processingStatus: "REGISTERED",

    filesCount: 0,
    filesToQc: 0,

    updatedAt: new Date(mongoDoc.updatedAt),
    createdAt: new Date(mongoDoc.createdAt)
  };
};
