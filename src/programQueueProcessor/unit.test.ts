import {
  CLINICAL_PROGRAM_UPDATE_TOPIC,
  RDPC_PROGRAM_UPDATE_TOPIC,
  RDPC_URL,
} from "config";
import { expect } from "chai";
import { GenericContainer } from "testcontainers";
import { StartedTestContainer, Wait } from "testcontainers";
import { promisify } from "util";
import { exec } from "child_process";
import DonorSchema from "indexClinicalData/clinicalMongo/donorModel";
import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
import createProgramQueueProcessor from "./index";
import { RollCallClient } from "../rollCall/types";
import createRollCallClient from "../rollCall";
import { Kafka } from "kafkajs";
import { ProgramQueueProcessor } from "./types";
import {
  expectedRDPCData,
  testDonorIds,
} from "rdpc/fixtures/integrationTest/dataset";
import { fetchAnalyses } from "rdpc/analysesProcessor";
import { Analysis, AnalysisType } from "rdpc/types";
import {
  mockSeqAlignmentAnalyses,
  mockSeqExpAnalyses,
} from "rdpc/fixtures/integrationTest/mockAnalyses";
import esb from "elastic-builder";
import { EsHit } from "indexClinicalData/types";

const TEST_US = "TEST-US";
const TEST_CA = "TEST-CA";
const DB_COLLECTION_SIZE = 10010;
const asyncExec = promisify(exec);

describe("kafka integration", () => {
  /******** Cooonfigs *********/
  const RESOLVED_INDEX_PARTS = {
    entity: "donor",
    type: "centric",
    shardPrefix: "pgm",
    releasePrefix: "re",
  };
  const ES_PORT = 9200;
  const ROLLCALL_PORT = 10091;
  const MONGO_PORT = 27017;
  const KAFKA_PORT = 9092;
  const NETOWRK_MODE = "host";
  const ALIAS_NAME = "donor_centric";
  let MONGO_URL: string;
  let KAFKA_HOST: string;
  /****************************/

  /******* Containers ********/
  let mongoContainer: StartedTestContainer;
  let elasticsearchContainer: StartedTestContainer;
  let rollcallContainer: StartedTestContainer;
  let kafkaContainer: StartedTestContainer;
  /***************************/

  /******** Clients *********/
  let esClient: Client;
  let rollcallClient: RollCallClient;
  let kafkaClient: Kafka;
  /**************************/

  let programQueueProcessor: ProgramQueueProcessor;

  before(async () => {
    try {
      // ***** start relevant servers *****
      [
        mongoContainer,
        elasticsearchContainer,
        kafkaContainer,
      ] = await Promise.all([
        new GenericContainer("mongo").withExposedPorts(MONGO_PORT).start(),
        new GenericContainer("elasticsearch", "7.5.0")
          .withNetworkMode(NETOWRK_MODE)
          .withExposedPorts(ES_PORT)
          .withEnv("discovery.type", "single-node")
          .withEnv("http.port", `${ES_PORT}`)
          .withHealthCheck({
            test: `curl -f http://localhost:${ES_PORT} || exit 1`, // this is executed inside the container
            startPeriod: new Duration(2, TemporalUnit.SECONDS),
            retries: 2,
            interval: new Duration(1, TemporalUnit.SECONDS),
            timeout: new Duration(5, TemporalUnit.SECONDS),
          })
          .withWaitStrategy(Wait.forHealthCheck())
          .start(),
        new GenericContainer("spotify/kafka", "latest")
          .withNetworkMode(NETOWRK_MODE)
          .withExposedPorts(KAFKA_PORT)
          .start(),
      ]);

      const ES_MAPPED_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}`;
      const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;

      rollcallContainer = await new GenericContainer(
        "overture/rollcall",
        "2.5.0"
      )
        .withNetworkMode(NETOWRK_MODE)
        .withExposedPorts(ROLLCALL_PORT)
        .withEnv("SPRING_PROFILES_ACTIVE", "test")
        .withEnv("SERVER_PORT", `${ROLLCALL_PORT}`)
        .withEnv("SPRING_CLOUD_VAULT_ENABLED", `${false}`)
        .withEnv("ELASTICSEARCH_NODE", `${ES_HOST}`)
        .withEnv("ROLLCALL_ALIASES_0_ALIAS", `${ALIAS_NAME}`)
        .withEnv("ROLLCALL_ALIASES_0_ENTITY", `${RESOLVED_INDEX_PARTS.entity}`)
        .withEnv("ROLLCALL_ALIASES_0_TYPE", `${RESOLVED_INDEX_PARTS.type}`)
        .withWaitStrategy(Wait.forLogMessage("Started RollcallApplication"))
        .start();

      const ROLLCALL_HOST = `http://${rollcallContainer.getContainerIpAddress()}:${ROLLCALL_PORT}`;
      KAFKA_HOST = `${kafkaContainer.getContainerIpAddress()}:${KAFKA_PORT}`;

      // ***** start relevant clients *****
      esClient = new Client({ node: ES_HOST });
      rollcallClient = createRollCallClient({
        url: `${ROLLCALL_HOST}`,
        ...RESOLVED_INDEX_PARTS,
        aliasName: ALIAS_NAME,
      });
      kafkaClient = new Kafka({
        clientId: `donor-submission-aggregator-test-${Math.random()}`,
        brokers: [KAFKA_HOST],
      });
      const kafkaAdmin = kafkaClient.admin();
      await kafkaAdmin.connect();
      await kafkaAdmin.createTopics({
        topics: [
          {
            topic: CLINICAL_PROGRAM_UPDATE_TOPIC,
            numPartitions: 1,
          },
          {
            topic: RDPC_PROGRAM_UPDATE_TOPIC,
            numPartitions: 1,
          },
        ],
      });
      await kafkaAdmin.disconnect();
      MONGO_URL = `mongodb://${mongoContainer.getContainerIpAddress()}:${mongoContainer.getMappedPort(
        MONGO_PORT
      )}/clinical`;
      await mongoose.connect(MONGO_URL);
    } catch (err) {
      console.log(`before >>>>>>>>>>>`, err);
      throw err;
    }
  });
  beforeEach(async () => {
    // inserts testing donors for TEST-CA:
    const result_1 = await asyncExec(
      `COLLECTION_SIZE=${testDonorIds.length} MONGO_URL=${MONGO_URL} npm run createIntegrationTestMongoDonors`
    );
    console.log("beforeEach >>>>>>>>>>> " + result_1.stdout);

    // inserts testing donors for TEST-US:
    const result_2 = await asyncExec(
      `PROGRAM_SHORT_NAME=${TEST_US} COLLECTION_SIZE=${DB_COLLECTION_SIZE} MONGO_URL=${MONGO_URL} npm run createMongoDonors`
    );
    console.log("beforeEach >>>>>>>>>> " + result_2.stdout);
  });

  after(async () => {
    await Promise.all([
      mongoContainer?.stop(),
      elasticsearchContainer?.stop(),
      rollcallContainer?.stop(),
      kafkaContainer?.stop(),
    ]);
  });
  afterEach(async function () {
    await DonorSchema().deleteMany({});
    console.log("programQueueProcessor: ", programQueueProcessor);
    await programQueueProcessor?.destroy();
  });

  describe("programQueueProcessor", () => {
    it.only("must index all clinical and RDPC data into Elasticsearch", async () => {
      const mockAnalysisFetcher: typeof fetchAnalyses = async (
        studyId: string,
        rdpcUrl: string,
        workflowRepoUrl: string,
        analysisType: string,
        from: number,
        size: number
      ): Promise<Analysis[]> => {
        return Promise.resolve(
          analysisType === AnalysisType.SEQ_EXPERIMENT
            ? mockSeqExpAnalyses.slice(from, from + size)
            : mockSeqAlignmentAnalyses.slice(from, from + size)
        );
      };

      // 1. update program TEST-US by publishing clinical event:
      programQueueProcessor = await createProgramQueueProcessor({
        kafka: kafkaClient,
        esClient,
        rollCallClient: rollcallClient,
        analysisFetcher: mockAnalysisFetcher,
      });

      await programQueueProcessor.enqueueEvent({
        programId: TEST_US,
        type: programQueueProcessor.knownEventTypes.CLINICAL,
      });
      // wait for indexing to complete
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });
      const totalEsDocuments_1 = (
        await esClient.search({
          index: ALIAS_NAME,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments_1).to.equal(DB_COLLECTION_SIZE);

      // 2. update TEST-CA by publishing a clinical event and a RDPC event:
      await programQueueProcessor.enqueueEvent({
        programId: TEST_CA,
        type: programQueueProcessor.knownEventTypes.CLINICAL,
      });
      await programQueueProcessor.enqueueEvent({
        programId: TEST_CA,
        type: programQueueProcessor.knownEventTypes.RDPC,
        rdpcGatewayUrls: [RDPC_URL],
      });

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      // check if number of TEST-CA documents is expected:
      const query_test_ca = esb
        .requestBodySearch()
        .query(esb.termQuery("programId", TEST_CA));

      const test_ca_documents = (
        await esClient.search({
          index: ALIAS_NAME,
          body: query_test_ca,
        })
      ).body?.hits?.total?.value;
      expect(test_ca_documents).to.equal(testDonorIds.length);

      // check if new rdpc data is relfected in TEST-CA
      const hits = await Promise.all(
        testDonorIds.map(async (donorId) => {
          const esQuery = esb
            .requestBodySearch()
            .size(testDonorIds.length)
            .query(esb.termQuery("donorId", "DO" + donorId));
          const test_ca_hits: EsHit[] = await esClient
            .search({
              index: ALIAS_NAME,
              body: esQuery,
            })
            .then((res) => res.body.hits.hits)
            .catch((err) => {
              return [];
            });
          return { donorId: donorId, hits: test_ca_hits } as {
            donorId: string;
            hits: EsHit[];
          };
        })
      );

      for (const test_ca_hit of hits) {
        const donorId = test_ca_hit.donorId;
        console.log(
          `expecting TEST-CA donor id = ${donorId} to have 1 es hit...`
        );

        expect(test_ca_hit.hits.length).to.equal(1);
        expect(test_ca_hit.hits[0]._source.alignmentsCompleted).to.equal(
          expectedRDPCData["DO" + donorId].alignmentsCompleted
        );
        expect(test_ca_hit.hits[0]._source.alignmentsFailed).to.equal(
          expectedRDPCData["DO" + donorId].alignmentsFailed
        );
        expect(test_ca_hit.hits[0]._source.alignmentsRunning).to.equal(
          expectedRDPCData["DO" + donorId].alignmentsRunning
        );
        expect(test_ca_hit.hits[0]._source.sangerVcsCompleted).to.equal(
          expectedRDPCData["DO" + donorId].sangerVcsCompleted
        );
        expect(test_ca_hit.hits[0]._source.sangerVcsFailed).to.equal(
          expectedRDPCData["DO" + donorId].sangerVcsFailed
        );
        expect(test_ca_hit.hits[0]._source.sangerVcsRunning).to.equal(
          expectedRDPCData["DO" + donorId].sangerVcsRunning
        );
      }

      // check if the number of TEST-US documents is expected:
      const query_test_us = esb
        .requestBodySearch()
        .query(esb.termQuery("programId", TEST_US));

      const test_us_documents = (
        await esClient.search({
          index: ALIAS_NAME,
          body: query_test_us,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(test_us_documents).to.equal(DB_COLLECTION_SIZE);

      const totalEsDocuments = (
        await esClient.search({
          index: ALIAS_NAME,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments).to.equal(
        testDonorIds.length + DB_COLLECTION_SIZE
      );
    });
  });
});
