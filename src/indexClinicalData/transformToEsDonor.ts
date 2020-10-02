import { MongoDonorDocument } from "indexClinicalData/clinicalMongo/donorModel";
import { EsDonorDocument, ClinicalDonorInfo } from "./types";
import { mean } from "lodash";
import { esDonorId } from "./utils";

export default async (
  mongoDoc: MongoDonorDocument,
  existingEsData?: EsDonorDocument
): Promise<EsDonorDocument> => {
  const submittedCoreDataPercent =
    mean(Object.values(mongoDoc?.completionStats?.coreCompletion || {})) || 0;

  const submittedExtendedDataPercent = 0; // this calcualtion is not yet defined

  const clinicalData: ClinicalDonorInfo = {
    validWithCurrentDictionary: mongoDoc.schemaMetadata.isValid,
    donorId: esDonorId(mongoDoc),
    submitterDonorId: mongoDoc.submitterId,
    programId: mongoDoc.programId,

    submittedCoreDataPercent: submittedCoreDataPercent,

    submittedExtendedDataPercent: submittedExtendedDataPercent,

    registeredNormalSamples: mongoDoc.specimens
      .filter((specimen) => specimen.tumourNormalDesignation === "Normal")
      .reduce((sum, specimen) => sum + specimen.samples.length, 0),

    registeredTumourSamples: mongoDoc.specimens
      .filter((specimen) => specimen.tumourNormalDesignation === "Tumour")
      .reduce((sum, specimen) => sum + specimen.samples.length, 0),

    updatedAt: new Date(mongoDoc.updatedAt),
    createdAt: new Date(mongoDoc.createdAt),
  };

  if (existingEsData) {
    return { ...existingEsData, ...clinicalData };
  } else {
    return {
      ...clinicalData,
      publishedNormalAnalysis: 0,
      publishedTumourAnalysis: 0,

      alignmentsCompleted: 0,
      alignmentsRunning: 0,
      alignmentsFailed: 0,

      sangerVcsCompleted: 0,
      sangerVcsRunning: 0,
      sangerVcsFailed: 0,

      totalFilesCount: 0,
      filesToQcCount: 0,

      releaseStatus: "NO_RELEASE",
      processingStatus: "REGISTERED",
    };
  }
};
