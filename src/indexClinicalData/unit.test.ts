import { Client } from "@elastic/elasticsearch";
import { expect } from "chai";
import { exec } from "child_process";
import { toEsBulkIndexActions } from "external/elasticsearch";
import { promisify } from "util";
import uuid from "uuid";
import { ClinicalDonor } from "../external/clinical/types";
import transformToEsDonor from "./transformToEsDonor";
import { EsDonorDocument } from "./types";

const TEST_PROGRAM_SHORT_NAME = "TESTPROG-CA";
const DB_COLLECTION_SIZE = 10010;
const TARGET_ES_INDEX = "test_prog";
const asyncExec = promisify(exec);

describe("transformToEsDonor", () => {
  it("must transform properly", async () => {
    const clinicalDoc = createDonor(TEST_PROGRAM_SHORT_NAME);
    const esDoc = transformToEsDonor(clinicalDoc as ClinicalDonor);
    expect(esDoc).to.deep.equal({
      validWithCurrentDictionary: true,
      releaseStatus: "NO_RELEASE",
      donorId: clinicalDoc.donorId,
      submitterDonorId: clinicalDoc.submitterId,
      programId: TEST_PROGRAM_SHORT_NAME,
      submittedCoreDataPercent: 0.666666666666667,
      submittedExtendedDataPercent: 0, // this calculation is not yet defined
      registeredNormalSamples: 5,
      registeredTumourSamples: 10,
      matchedTNPairsDNA: 0,
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
      mutectFailed: 0,
      mutectRunning: 0,
      openAccessCompleted: 0,
      openAccessFailed: 0,
      openAccessRunning: 0,
      processingStatus: "REGISTERED",
      coreCompletionDate: new Date(
        clinicalDoc.completionStats.coreCompletionDate
      ),
      updatedAt: new Date(clinicalDoc.updatedAt),
      createdAt: new Date(clinicalDoc.createdAt),
      totalFilesCount: 0,
      filesToQcCount: 0,
    } as EsDonorDocument);
  });
});

const createDonor = (programShortName: string) => {
  const submitterId = uuid();
  return {
    programId: programShortName,
    gender: "female",
    submitterId: submitterId,
    createdAt: new Date().toString(),
    updatedAt: new Date().toString(),
    donorId: `DO${Math.floor(Math.random() * 10000)}`,
    schemaMetadata: {
      isValid: true,
      lastValidSchemaVersion: "",
      originalSchemaVersion: "",
      lastMigrationId: uuid(),
    },
    completionStats: {
      coreCompletion: {
        donor: 1,
        specimens: 0,
        primaryDiagnosis: 1,
        followUps: 0,
        treatments: 1,
      },
      coreCompletionPercentage: 0.666666666666667,
      overriddenCoreCompletion: [],
      coreCompletionDate: new Date().toISOString(),
    },
    clinicalInfo: {},
    primaryDiagnosis: {
      clinicalInfo: {},
    },
    specimens: [
      {
        clinicalInfo: {},
        samples: [
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
        ],
        specimenTissueSource: "",
        specimenType: "",
        specimenId: `SP${Math.random()}`,
        submitterId: submitterId,
        tumourNormalDesignation: "Normal",
      },
      {
        clinicalInfo: {},
        samples: [
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
        ],
        specimenTissueSource: "",
        specimenType: "",
        specimenId: `SP${Math.random()}`,
        submitterId: submitterId,
        tumourNormalDesignation: "Tumour",
      },
      {
        clinicalInfo: {},
        samples: [
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
          {
            clinicalInfo: {},
            sampleType: "",
            submitterId: submitterId,
            sampleId: `SA${Math.random()}`,
          },
        ],
        specimenTissueSource: "",
        specimenType: "",
        specimenId: `SP${Math.random()}`,
        submitterId: submitterId,
        tumourNormalDesignation: "Tumour",
      },
    ],
    followUps: [],
    treatments: [],
    primaryDiagnoses: [],
    familyHistory: [],
    exposure: [],
    comorbidity: [],
    biomarker: [],
  } as ClinicalDonor;
};

const writeEsDocumentsToIndex = async (
  client: Client,
  index: string,
  documents: Array<EsDonorDocument>
) => {
  try {
    await client.bulk({
      body: toEsBulkIndexActions<EsDonorDocument>(
        index,
        (donor) => donor.donorId
      )(documents),
      refresh: "true",
    });
  } catch (error) {
    console.log(`writeEsDocumentsToIndex --- ${error}`);
  }
};
