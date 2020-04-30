import { MongoDonorDocument } from "donorModel";
import { EsDonorDocument } from "./types";
import { mean } from 'lodash';

export default async (
  mongoDoc: MongoDonorDocument
): Promise<EsDonorDocument> => {
  const submittedCoreDataPercent =  mean(Object.values(mongoDoc?.completionStats?.coreCompletion || {}));

  const submittedExtendedDataPercent = 0; // this calcualtion is not yet defined


  return {
    validWithCurrentDictionary: mongoDoc.schemaMetadata.isValid,

    releaseStatus: "NO_RELEASE",

    donorId: `DO${mongoDoc.donorId}`,
    submitterDonorId: mongoDoc.submitterId,
    programId: mongoDoc.programId,

    submittedCoreDataPercent: submittedCoreDataPercent,

    submittedExtendedDataPercent: submittedExtendedDataPercent,

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

    totalFilesCount: 0,
    filesToQcCount: 0,

    updatedAt: new Date(mongoDoc.updatedAt),
    createdAt: new Date(mongoDoc.createdAt)
  };
};
