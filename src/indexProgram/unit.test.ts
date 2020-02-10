import { expect } from "chai";
import indexProgram from "indexProgram";
import transformToEsDonor from "./transformToEsDonor";
import programDonorStream from "./programDonorStream";
import { GenericContainer } from "testcontainers";
import { StartedTestContainer } from "testcontainers/dist/test-container";
import { promisify } from "util";
import { exec } from "child_process";
import uuid from "uuid";
import DonorSchema from "donorModel";
import mongoose from "mongoose";
import { Donor } from "donorModel/types";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";

const TEST_PROGRAM_SHORT_NAME = "MINH-CA";
const DB_COLLECTION_SIZE = 10010;
const TARGET_ES_INDEX = "test_prog";
const asyncExec = promisify(exec);

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

describe("indexing programs", () => {
  let mongoContainer: StartedTestContainer;
  let elasticsearchContainer: StartedTestContainer;
  let esClient: Client;
  const ES_PORT = 9200;
  const MONGO_PORT = 27017;
  let MONGO_URL: string;
  before(async () => {
    try {
      [mongoContainer, elasticsearchContainer] = await Promise.all([
        new GenericContainer("mongo").withExposedPorts(MONGO_PORT).start(),
        new GenericContainer("elasticsearch", "7.5.0")
          .withStartupTimeout(new Duration(120, TemporalUnit.SECONDS))
          .withExposedPorts(ES_PORT)
          .withEnv("discovery.type", "single-node")
          .start()
      ]);
      const ES_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}:${elasticsearchContainer.getMappedPort(
        ES_PORT
      )}`;
      esClient = new Client({
        node: ES_HOST
      });
      MONGO_URL = `mongodb://${mongoContainer.getContainerIpAddress()}:${mongoContainer.getMappedPort(
        MONGO_PORT
      )}/clinical`;
      await mongoose.connect(MONGO_URL);
    } catch (err) {
      console.error("before >>>>>>>>>>>", err);
    }
  });
  after(async () => {
    await mongoContainer.stop();
    await elasticsearchContainer.stop();
  });
  beforeEach(async function() {
    const { stdout } = await asyncExec(
      `PROGRAM_SHORT_NAME=${TEST_PROGRAM_SHORT_NAME} COLLECTION_SIZE=${DB_COLLECTION_SIZE} MONGO_URL=${MONGO_URL} npm run createMongoDonors`
    );
    console.log("beforeEach >>>>>>>>>>>", stdout);
    await esClient.indices.create({
      index: TARGET_ES_INDEX
    });
  });
  afterEach(async function() {
    await DonorSchema().deleteMany({});
    await esClient.indices.delete({
      index: TARGET_ES_INDEX
    });
  });

  describe("programDonorStream", () => {
    it("must stream all donors", async function() {
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

  describe("indexProgram", () => {
    it("must index all data into Elasticsearch", async function() {
      console.time("indexProgram");
      await indexProgram(TEST_PROGRAM_SHORT_NAME, TARGET_ES_INDEX, esClient);
      console.timeEnd("indexProgram");
      const totalEsDocuments = (
        await esClient.search({
          index: TARGET_ES_INDEX,
          track_total_hits: true
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments).to.equal(DB_COLLECTION_SIZE);
    });
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
