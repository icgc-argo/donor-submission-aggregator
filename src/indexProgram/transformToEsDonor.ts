import { MongoDonorDocument } from "donorModel";
import { EsDonorDocument } from "./types";

export default async (
  mongoDoc: MongoDonorDocument
): Promise<EsDonorDocument> => {
  return {
    validWithCurrentDictionary: true,

    releaseStatus: "",

    donorId: mongoDoc.donorId,
    submitterDonorId: mongoDoc.submitterId,
    programId: mongoDoc.programId,

    submittedCoreDataPercent: 0,

    submittedExtendedDataPercent: 0,

    registeredNormalSamples: mongoDoc.specimens.reduce(
      (acc, specimen) => [
        ...acc,
        specimen.samples.filter(sample => sample.sampleType)
      ],
      []
    ).length,
    registeredTumourSamples: mongoDoc.specimens.reduce(
      (acc, specimen) => [...acc, specimen.samples.filter(sample => true)],
      []
    ).length,

    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,

    alignmentsCompleted: 0,
    alignmentsRunning: 0,
    alignmentsFailed: 0,

    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,

    processingStatus: "",

    updatedAt: new Date(mongoDoc.updatedAt),
    createdAt: new Date(mongoDoc.createdAt)
  };
};
