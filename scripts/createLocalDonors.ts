import uuid from "uuid";
import { LocalMongoDonorDocument } from "../src/indexClinicalData/clinicalMongo/donorModel";

export default (programShortName: string, donorId: string) => {
  const submitterId = uuid();
  return {
    programId: programShortName,
    gender: "female",
    submitterId: submitterId,
    createdAt: new Date().toString(),
    updatedAt: new Date().toString(),
    donorId: donorId,
    schemaMetadata: {
      isValid: true,
      lastValidSchemaVersion: "",
      originalSchemaVersion: "",
      lastMigrationId: uuid(),
    },
    clinicalInfo: {},
    primaryDiagnosis: {
      clinicalInfo: {},
    },
    completionStats: {
      coreCompletion: {
        donor: 1,
        specimens: 0,
        primaryDiagnosis: 1,
        followUps: 0,
        treatments: 1,
      },
      overriddenCoreCompletion: [],
    },
    specimens: [
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: "Normal",
      },
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: "Tumour",
      },
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: "Tumour",
      },
    ],
    followUps: [
      {
        clinicalInfo: {},
      },
    ],
    treatments: [
      {
        clinicalInfo: {},
        therapies: [
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" },
        ],
      },
    ],
  } as LocalMongoDonorDocument;
};
