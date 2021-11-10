import { expect } from "chai";
import indexProgram, { queryDocumentsByDonorIds } from "indexClinicalData";
import transformToEsDonor from "./transformToEsDonor";
import programDonorStream from "./programDonorStream";
import { GenericContainer } from "testcontainers";
import { StartedTestContainer } from "testcontainers/dist/test-container";
import { promisify } from "util";
import { exec } from "child_process";
import uuid from "uuid";
import DonorSchema, {
  MongoDonorDocument,
} from "indexClinicalData/clinicalMongo/donorModel";
import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";

import { EsDonorDocument, RdpcDonorInfo } from "./types";
import { initIndexMapping, toEsBulkIndexActions } from "elasticsearch";
import { esDonorId } from "./utils";
import { mean, range, random } from "lodash";
import { DonorMolecularDataReleaseStatus } from "files/types";

const TEST_PROGRAM_SHORT_NAME = "TESTPROG-CA";
const DB_COLLECTION_SIZE = 10010;
const TARGET_ES_INDEX = "test_prog";
const asyncExec = promisify(exec);

describe("transformToEsDonor", () => {
  it("must transform properly", async () => {
    const mongoDoc = createDonor(TEST_PROGRAM_SHORT_NAME);
    const esDoc = transformToEsDonor(mongoDoc);
    expect(esDoc).to.deep.equal({
      validWithCurrentDictionary: true,
      releaseStatus: "NO_RELEASE",
      donorId: `DO${mongoDoc.donorId}`,
      submitterDonorId: mongoDoc.submitterId,
      programId: TEST_PROGRAM_SHORT_NAME,
      submittedCoreDataPercent: 0.666666666666667,
      submittedExtendedDataPercent: 0, // this calculation is not yet defined
      registeredNormalSamples: 5,
      registeredTumourSamples: 10,
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
      updatedAt: new Date(mongoDoc.updatedAt),
      createdAt: new Date(mongoDoc.createdAt),
      totalFilesCount: 0,
      filesToQcCount: 0,
    } as EsDonorDocument);
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
          .start(),
      ]);
      const ES_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}:${elasticsearchContainer.getMappedPort(
        ES_PORT
      )}`;
      esClient = new Client({
        node: ES_HOST,
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
  beforeEach(async function () {
    const { stdout } = await asyncExec(
      `PROGRAM_SHORT_NAME=${TEST_PROGRAM_SHORT_NAME} COLLECTION_SIZE=${DB_COLLECTION_SIZE} MONGO_URL=${MONGO_URL} npm run createMongoDonors`
    );
    console.log("beforeEach >>>>>>>>>>>", stdout);

    await esClient.indices.create({
      index: TARGET_ES_INDEX,
    });

    try {
      await esClient.indices.close({
        index: TARGET_ES_INDEX,
      });
    } catch (error) {
      console.log(
        `close index before updating settings --- ${JSON.stringify(error)}`
      );
    }

    try {
      await esClient.indices.putSettings({
        index: TARGET_ES_INDEX,
        body: {
          settings: {
            analysis: {
              analyzer: {
                whitespaceAnalyzer: {
                  tokenizer: "whitespace",
                  filter: ["lowercase"],
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.log(`putsettings ---- ${JSON.stringify(error)}`);
    }

    try {
      await esClient.indices.open({
        index: TARGET_ES_INDEX,
      });
    } catch (error) {
      console.log(`reopen index --- ${JSON.stringify(error)}`);
    }

    await initIndexMapping(TARGET_ES_INDEX, esClient);
  });
  afterEach(async function () {
    await DonorSchema().deleteMany({});
    await esClient.indices.delete({
      index: TARGET_ES_INDEX,
    });
  });

  describe("programDonorStream", () => {
    it("must stream all donors", async function () {
      const trunkSize = 1000;
      let donorCount = 0;
      const donorStream = programDonorStream(TEST_PROGRAM_SHORT_NAME, {
        chunkSize: trunkSize,
      });
      for await (const chunk of donorStream) {
        donorCount = donorCount += chunk.length;
      }
      expect(donorCount).to.equal(DB_COLLECTION_SIZE);
    });
  });

  describe("indexProgram", () => {
    it("must index all data into Elasticsearch", async function () {
      console.time("indexProgram");
      await indexProgram(TEST_PROGRAM_SHORT_NAME, TARGET_ES_INDEX, esClient);
      console.timeEnd("indexProgram");
      const totalEsDocuments = (
        await esClient.search({
          index: TARGET_ES_INDEX,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments).to.equal(DB_COLLECTION_SIZE);
    });
  });

  describe("mergeIndexedData", () => {
    it("must sucessfully clone previously indexed RDPC data when a donor is updated", async function () {
      // manually create and insert a donor into ES with notable RDPC data

      const existingDonor = createDonor(TEST_PROGRAM_SHORT_NAME);

      const uniqueRDPCinfo = {
        publishedNormalAnalysis: 22,
        alignmentsCompleted: 44,
        sangerVcsCompleted: 55,
        totalFilesCount: 66,
        releaseStatus: DonorMolecularDataReleaseStatus.PARTIALLY_RELEASED,
      };

      const preExistingEsDonor: EsDonorDocument = {
        ...transformToEsDonor(existingDonor),
        ...uniqueRDPCinfo,
      };

      await writeEsDocumentsToIndex(esClient, TARGET_ES_INDEX, [
        preExistingEsDonor,
      ]);

      // simulate the modification of the donor and its insertion into mongo

      const newCoreCompletionStats = {
        donor: 0.4,
        specimens: 0.4,
        primaryDiagnosis: 0.2,
        followUps: 1,
        treatments: 0,
      };

      const modifiedDonor: MongoDonorDocument = {
        ...existingDonor,
        completionStats: {
          coreCompletion: newCoreCompletionStats,
          coreCompletionPercentage: 0.4,
          overriddenCoreCompletion: [],
        },
      };
      const modifiedSubmittedCoreValue = mean(
        Object.values(newCoreCompletionStats)
      );

      await DonorSchema().create(modifiedDonor);

      // mimic the program being re-indexed with updated donor
      await indexProgram(TEST_PROGRAM_SHORT_NAME, TARGET_ES_INDEX, esClient);

      // query for the donor and test that it merged the new clinical data with the old RDPC data
      const esHits = await queryDocumentsByDonorIds(
        [esDonorId(modifiedDonor)],
        esClient,
        TARGET_ES_INDEX
      );
      expect(esHits.length).to.equal(1);
      expect(esHits[0]._source).to.deep.include({
        submittedCoreDataPercent: modifiedSubmittedCoreValue,
        ...uniqueRDPCinfo,
      });
    });

    it("must not incorrectly merge any old data for a new unrelated donor", async function () {
      const rdpcInfoKeys: Array<keyof RdpcDonorInfo> = [
        "publishedTumourAnalysis",
        "publishedTumourAnalysis",
        "alignmentsCompleted",
        "alignmentsRunning",
        "alignmentsFailed",
        "sangerVcsCompleted",
        "sangerVcsRunning",
        "sangerVcsFailed",
        "totalFilesCount",
        "filesToQcCount",
      ];
      const preExistingEsDonors: Array<EsDonorDocument> = await Promise.all(
        // load in some preExisting donors with random RDPC data
        range(0, 20).map(async () => {
          const randomRDCPNumbers = Object.fromEntries(
            rdpcInfoKeys.map((prop) => [prop, random(0, 100)])
          );
          return {
            ...transformToEsDonor(createDonor(TEST_PROGRAM_SHORT_NAME)),
            ...randomRDCPNumbers,
          };
        })
      );

      await writeEsDocumentsToIndex(
        esClient,
        TARGET_ES_INDEX,
        preExistingEsDonors
      );

      // add a new unrelated donor
      const newDonor = createDonor(TEST_PROGRAM_SHORT_NAME);

      await DonorSchema().create(newDonor);
      await indexProgram(TEST_PROGRAM_SHORT_NAME, TARGET_ES_INDEX, esClient);

      const esHits = await queryDocumentsByDonorIds(
        [esDonorId(newDonor)],
        esClient,
        TARGET_ES_INDEX
      );

      // dates wont match up because ES formats them differently
      const { createdAt, updatedAt, ...otherDetails } = transformToEsDonor(
        newDonor
      );

      expect(esHits.length).to.equal(1);
      // ensure the new donor remains unchanged (besides date)
      expect(esHits[0]._source).to.deep.include(otherDetails);
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
    },
    clinicalInfo: {},
    primaryDiagnosis: {
      clinicalInfo: {},
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
  } as MongoDonorDocument;
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
