import { expect } from "chai";
import indexProgram from "indexProgram";
import transformToEsDonor from "./transformToEsDonor";
import programDonorStream from "./programDonorStream";
import { promisify } from "util";
import { exec } from "child_process";
import connectMongo from "connectMongo";
import uuid from "uuid";
import DonorSchema from "donorModel";
import mongoose from "mongoose";
import { Donor } from "donorModel/types";
import { Client } from "@elastic/elasticsearch";
import { ES_HOST } from "config";

const TEST_PROGRAM_SHORT_NAME = "MINH-CA";
const DB_COLLECTION_SIZE = 10000;
const TARGET_ES_INDEX = "test_index";
const asyncExec = promisify(exec);

const esClient = new Client({
  node: ES_HOST
});

describe("transformToEsDonor", () => {
  it("must transform properly", async () => {
    const mongoDoc = createDonor(TEST_PROGRAM_SHORT_NAME);
    const esDoc = await transformToEsDonor(mongoDoc);
    expect(esDoc).to.deep.equal({
      validWithCurrentDictionary: true,
      releaseStatus: "",
      donorId: mongoDoc.donorId,
      submitterDonorId: mongoDoc.submitterId,
      programId: TEST_PROGRAM_SHORT_NAME,
      submittedCoreDataPercent: 0,
      submittedExtendedDataPercent: 0,
      registeredNormalSamples: 3,
      registeredTumourSamples: 3,
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
    });
  });
});

describe("indexProgram", () => {
  beforeEach(async function() {
    this.timeout(30000);
    const { stdout } = await asyncExec(
      `PROGRAM_SHORT_NAME=${TEST_PROGRAM_SHORT_NAME} COLLECTION_SIZE=${DB_COLLECTION_SIZE} npm run createMongoDonors`
    );
    console.log(stdout);
    await connectMongo();
    await esClient.indices.create({
      index: TARGET_ES_INDEX
    });
  });
  afterEach(async function() {
    this.timeout(30000);
    await DonorSchema.deleteMany({}, async () => {});
    await mongoose.disconnect();
    await esClient.indices.delete({
      index: TARGET_ES_INDEX
    });
  });

  describe("programDonorStream", () => {
    it("must stream all donors", async function() {
      this.timeout(20000);
      const trunkSize = 1000;
      let donorCount = 0;
      const donorStream = programDonorStream(TEST_PROGRAM_SHORT_NAME, {
        chunkSize: trunkSize
      });
      for await (const chunk of donorStream) {
        donorCount = donorCount += chunk.length;
      }
      expect(donorCount).to.equal(DB_COLLECTION_SIZE);
    });
  });

  it("must index all data into Elasticsearch", async function() {
    this.timeout(20000);
    console.time("indexProgram");
    await indexProgram(TEST_PROGRAM_SHORT_NAME, TARGET_ES_INDEX);
    console.timeEnd("indexProgram");
    const totalEsDocuments = (
      await esClient.search({
        index: TARGET_ES_INDEX
      })
    ).body?.hits?.total?.value;
    expect(totalEsDocuments).to.equal(DB_COLLECTION_SIZE);
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
    donorId: Math.random(),
    schemaMetadata: {
      isValid: true,
      lastValidSchemaVersion: "",
      originalSchemaVersion: "",
      lastMigrationId: uuid()
    },
    clinicalInfo: {},
    primaryDiagnosis: {
      clinicalInfo: {}
    },
    specimens: [
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 }
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: ""
      },
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 }
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: ""
      },
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 }
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: ""
      }
    ],
    followUps: [
      {
        clinicalInfo: {}
      }
    ],
    treatments: [
      {
        clinicalInfo: {},
        therapies: [
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" }
        ]
      }
    ]
  } as Donor;
};
