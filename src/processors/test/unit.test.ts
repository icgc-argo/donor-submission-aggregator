import { Client } from "@elastic/elasticsearch";
import { expect } from "chai";
import { exec } from "child_process";
import { kafkaConfig, RDPC_URL, rollcallConfig } from "config";
import esb from "elastic-builder";
import { getIndexSettings, getLatestIndexName } from "external/elasticsearch";
import donorIndexMapping from "external/elasticsearch/donorIndexMapping.json";
import { queueProgramUpdateEvent } from "external/kafka/producers/programQueueProducer";
import { EsHit } from "indexClinicalData/types";
import { Kafka } from "kafkajs";
import { Duration, TemporalUnit } from "node-duration";
import {
  clinicalDataset,
  expectedRDPCData,
  testDonorIds,
} from "rdpc/test/fixtures/integrationTest/dataset";
import { seqExpAnalyses } from "rdpc/test/fixtures/integrationTest/mockAnalyses";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { promisify } from "util";
import * as kafka from "../../external/kafka";
import createRollCallClient from "../../external/rollCall";
import { RollCallClient } from "../../external/rollCall/types";
import {
  mockAnalysesWithSpecimensFetcher,
  mockAnalysisFetcher,
  mockVariantCallingFetcher,
} from "./MockFetch";
import processClinicalUpdateEvent from "../processClinicalUpdate";
import { KnownEventType } from "../types";
import { generateIndexName } from "../util";
import processRdpcAnalysisUpdateEvent from "processors/processRdpcAnalysisUpdate";

const TEST_US = "TEST-US";
const TEST_CA = "TEST-CA";
const DB_COLLECTION_SIZE = 10010;
const asyncExec = promisify(exec);

const mockDlqSender = async (message: string) => Promise.resolve(undefined);

describe("kafka integration", () => {
  /******** Cooonfigs *********/
  const RESOLVED_INDEX_PARTS = {
    entity: "donor",
    type: "centric",
    shardPrefix: "program",
    releasePrefix: "re",
  };
  const ES_PORT = 9200;
  const ROLLCALL_PORT = 10091;
  const KAFKA_PORT = 9092;
  const NETOWRK_MODE = "host";
  const ROLLCALL_ALIAS_NAME = rollcallConfig.aliasName;
  let KAFKA_HOST: string;
  /****************************/

  /******* Containers ********/
  let elasticsearchContainer: StartedTestContainer;
  let rollcallContainer: StartedTestContainer;
  let kafkaContainer: StartedTestContainer;
  /***************************/

  /******** Clients *********/
  let esClient: Client;
  let rollcallClient: RollCallClient;
  let kafkaClient: Kafka;
  /**************************/

  before(async () => {
    try {
      // ***** start relevant servers *****
      [elasticsearchContainer, kafkaContainer] = await Promise.all([
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
        .withEnv("ROLLCALL_ALIASES_0_ALIAS", `${ROLLCALL_ALIAS_NAME}`)
        .withEnv("ROLLCALL_ALIASES_0_ENTITY", `${RESOLVED_INDEX_PARTS.entity}`)
        .withEnv("ROLLCALL_ALIASES_0_TYPE", `${RESOLVED_INDEX_PARTS.type}`)
        .withWaitStrategy(Wait.forLogMessage("Started RollcallApplication"))
        .start();

      const ROLLCALL_HOST = `http://${rollcallContainer.getContainerIpAddress()}:${ROLLCALL_PORT}`;
      KAFKA_HOST = `${kafkaContainer.getContainerIpAddress()}:${KAFKA_PORT}`;

      // ***** start relevant clients *****
      esClient = new Client({ node: ES_HOST });
      rollcallClient = await createRollCallClient({
        rootUrl: `${ROLLCALL_HOST}`,
        aliasName: ROLLCALL_ALIAS_NAME,
        indexEntity: RESOLVED_INDEX_PARTS.entity,
        indexType: RESOLVED_INDEX_PARTS.type,
        shardPrefix: RESOLVED_INDEX_PARTS.shardPrefix,
      });
      await kafka.setup({
        clientId: `donor-submission-aggregator-test-${Math.random()}`,
        brokers: [KAFKA_HOST],
      });

      // Make some kafka topics - can probably remove since by defaults topics are created when a producer sends a message
      kafkaClient = new Kafka({
        clientId: `donor-submission-aggregator-test-${Math.random()}`,
        brokers: [KAFKA_HOST],
      });
      const kafkaAdmin = kafkaClient.admin();
      await kafkaAdmin.connect();
      await kafkaAdmin.createTopics({
        topics: [
          {
            topic: kafkaConfig.consumers.clinicalUpdates.topic,
            numPartitions: 1,
          },
          {
            topic: kafkaConfig.consumers.rdpcAnalysisUpdates.topic,
            numPartitions: 1,
          },
        ],
      });
      await kafkaAdmin.disconnect();
    } catch (err) {
      console.log(`before >>>>>>>>>>>`, err);
      throw err;
    }
  });

  const createIndexAndAlias = async (programId: string) => {
    const firstIndexName = generateIndexName(programId) + "re_1";
    await esClient.indices.create({
      index: firstIndexName,
    });
    const response_exist = await esClient.indices.exists({
      index: firstIndexName,
    });
    console.log(`expecting index ${firstIndexName} to exist...`);
    expect(response_exist.body).to.be.true;

    await esClient.indices.updateAliases({
      body: {
        actions: {
          add: { index: firstIndexName, alias: ROLLCALL_ALIAS_NAME },
        },
      },
    });
    const response_alias = await esClient.cat.aliases({
      name: ROLLCALL_ALIAS_NAME,
      format: "JSON",
      h: ["alias", "index"],
    });

    console.log(
      `expecting index ${firstIndexName} to have alias ${ROLLCALL_ALIAS_NAME}...`
    );
    expect(response_alias.body).to.deep.include({
      alias: ROLLCALL_ALIAS_NAME,
      index: firstIndexName,
    });
  };

  after(async () => {
    await Promise.all([
      elasticsearchContainer?.stop(),
      rollcallContainer?.stop(),
      kafkaContainer?.stop(),
    ]);
  });
  afterEach(async function () {
    try {
      console.log("afterEach >>>>>>>>>>> ");
      await kafka.disconnect();

      console.log("deleting all indices and alias from elasticsearch...");
      await esClient.indices.delete({
        index: "_all",
      });
    } catch (error) {
      console.log("error in afterEach >>>>>>>" + error);
      throw error;
    }
  });

  describe("programQueueProcessor", () => {
    it("must index all clinical and RDPC data into Elasticsearch", async () => {
      // create a dummy index and attach it to alias, alias must exist for testing:
      await createIndexAndAlias("DUM-CA");

      // 1. update program TEST-US by publishing clinical event:
      await processClinicalUpdateEvent(
        {
          programId: TEST_US,
          type: KnownEventType.CLINICAL,
        },
        mockDlqSender,
        { esClient, rollcallClient }
      );
      // wait for indexing to complete
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      const totalEsDocuments_1 = (
        await esClient.search({
          index: ROLLCALL_ALIAS_NAME,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments_1).to.equal(DB_COLLECTION_SIZE);

      // 2. update TEST-CA by publishing a clinical event and a RDPC event:
      await processClinicalUpdateEvent(
        {
          programId: TEST_US,
          type: KnownEventType.CLINICAL,
        },
        mockDlqSender,
        { esClient, rollcallClient }
      );

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      const query_test_ca = esb
        .requestBodySearch()
        .query(esb.termQuery("programId", TEST_CA));

      const test_ca_documents_clinical = (
        await esClient.search({
          index: ROLLCALL_ALIAS_NAME,
          body: query_test_ca,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      console.log(
        `expecting test_ca_documents_clinical to be ${testDonorIds.length}`
      );
      expect(test_ca_documents_clinical).to.equal(testDonorIds.length);

      await processRdpcAnalysisUpdateEvent(
        {
          programId: TEST_CA,
          type: KnownEventType.RDPC,
          rdpcGatewayUrls: [RDPC_URL],
        },
        mockDlqSender,
        {
          esClient,
          rollcallClient,
          analysesFetcher: mockAnalysisFetcher,
          analysesWithSpecimensFetcher: mockAnalysesWithSpecimensFetcher,
          fetchVC: mockVariantCallingFetcher,
        }
      );
      await queueProgramUpdateEvent({
        programId: TEST_CA,
        type: KnownEventType.RDPC,
        rdpcGatewayUrls: [RDPC_URL],
      });

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      const test_ca_documents_rdpc = (
        await esClient.search({
          index: ROLLCALL_ALIAS_NAME,
          body: query_test_ca,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      console.log(
        `expecting test_ca_documents_rdpc to be ${testDonorIds.length}`
      );
      expect(test_ca_documents_rdpc).to.equal(testDonorIds.length);

      // check if new rdpc data is relfected in TEST-CA
      const hits = await Promise.all(
        testDonorIds.map(async (donorId) => {
          const esQuery = esb
            .requestBodySearch()
            .size(testDonorIds.length)
            .query(esb.termQuery("donorId", "DO" + donorId));
          const test_ca_hits: EsHit[] = await esClient
            .search({
              index: ROLLCALL_ALIAS_NAME,
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
        expect(test_ca_hit.hits[0]._source.mutectCompleted).to.equal(
          expectedRDPCData["DO" + donorId].mutectCompleted
        );
        expect(test_ca_hit.hits[0]._source.mutectRunning).to.equal(
          expectedRDPCData["DO" + donorId].mutectRunning
        );
        expect(test_ca_hit.hits[0]._source.mutectFailed).to.equal(
          expectedRDPCData["DO" + donorId].mutectFailed
        );
        expect(test_ca_hit.hits[0]._source.openAccessCompleted).to.equal(
          expectedRDPCData["DO" + donorId].openAccessCompleted
        );
        expect(test_ca_hit.hits[0]._source.openAccessRunning).to.equal(
          expectedRDPCData["DO" + donorId].openAccessRunning
        );
        expect(test_ca_hit.hits[0]._source.openAccessFailed).to.equal(
          expectedRDPCData["DO" + donorId].openAccessFailed
        );
        expect(
          test_ca_hit.hits[0]._source.sangerVcsFirstPublishedDate
        ).to.equal(
          expectedRDPCData["DO" + donorId].sangerVcsFirstPublishedDate
        );
        expect(test_ca_hit.hits[0]._source.mutectFirstPublishedDate).to.equal(
          expectedRDPCData["DO" + donorId].mutectFirstPublishedDate
        );
        expect(
          test_ca_hit.hits[0]._source.openAccessFirstPublishedDate
        ).to.equal(
          expectedRDPCData["DO" + donorId].openAccessFirstPublishedDate
        );
      }

      // check if the number of TEST-US documents is expected:
      const query_test_us = esb
        .requestBodySearch()
        .query(esb.termQuery("programId", TEST_US));

      const test_us_documents = (
        await esClient.search({
          index: ROLLCALL_ALIAS_NAME,
          body: query_test_us,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      console.log(`expecting test_us_documents to equal ${DB_COLLECTION_SIZE}`);
      expect(test_us_documents).to.equal(DB_COLLECTION_SIZE);

      const totalEsDocuments = (
        await esClient.search({
          index: ROLLCALL_ALIAS_NAME,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments).to.equal(
        testDonorIds.length + DB_COLLECTION_SIZE
      );
    });

    it("must create new index with correct settings and index data", async () => {
      // make sure alias exist before test starts:
      await createIndexAndAlias(TEST_CA);

      // 1.If a program has never been indexed before, newly created index settings
      // should be the same as default index settings

      await processClinicalUpdateEvent(
        {
          programId: TEST_US,
          type: KnownEventType.CLINICAL,
        },
        mockDlqSender,
        { esClient, rollcallClient }
      );

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      // verify results:
      const existingIndexName = await getLatestIndexName(esClient, TEST_US);

      console.log(`expecting to find 1 index ${existingIndexName}`);
      expect(existingIndexName).to.not.equal("");

      const response = await getIndexSettings(esClient, existingIndexName);

      const indexSettings = response.body[existingIndexName].settings.index;
      const currentNumOfShards = parseInt(indexSettings.number_of_shards);
      const currentNumOfReplicas = parseInt(indexSettings.number_of_replicas);

      expect(currentNumOfReplicas).to.equal(
        donorIndexMapping.settings["index.number_of_replicas"]
      );
      expect(currentNumOfShards).to.equal(
        donorIndexMapping.settings["index.number_of_shards"]
      );

      // 2.if a new event is published to index the same program,
      // a new index should be created and index settings should be equal to default settings.
      await processClinicalUpdateEvent(
        {
          programId: TEST_US,
          type: KnownEventType.CLINICAL,
        },
        mockDlqSender,
        { esClient, rollcallClient }
      );

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      const existingIndexName_1 = await getLatestIndexName(esClient, TEST_US);

      console.log(`expecting to find 1 index ${existingIndexName_1}...`);
      expect(existingIndexName_1).to.not.equal("");

      const response_2 = await getIndexSettings(esClient, existingIndexName_1);

      const indexSettings_1 =
        response_2.body[existingIndexName_1].settings.index;
      const currentNumOfShards_1 = parseInt(indexSettings_1.number_of_shards);
      const currentNumOfReplicas_1 = parseInt(
        indexSettings_1.number_of_replicas
      );

      expect(currentNumOfReplicas_1).to.equal(
        donorIndexMapping.settings["index.number_of_replicas"]
      );
      expect(currentNumOfShards_1).to.equal(
        donorIndexMapping.settings["index.number_of_shards"]
      );

      // 3.second index should have all documents cloned from first idnex:
      const test_us_documents = (
        await esClient.search({
          index: existingIndexName_1,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(test_us_documents).to.equal(DB_COLLECTION_SIZE);
    });

    it(
      "must not clone an index when index settings do not equal to default settings," +
        "it must create a new index with correct settings and reindex all documents from previous index",
      async () => {
        await createIndexAndAlias(TEST_CA);
        const firstIndexName = generateIndexName(TEST_CA) + "re_1";

        // bulk insert data:
        const body = clinicalDataset.flatMap((doc) => [
          { index: { _index: firstIndexName } },
          doc,
        ]);
        console.log(`Bulk indexing clinical data into ${firstIndexName}....`);

        await esClient.bulk({
          body,
          refresh: "wait_for",
        });

        await processClinicalUpdateEvent(
          {
            programId: TEST_US,
            type: KnownEventType.CLINICAL,
          },
          mockDlqSender,
          { esClient, rollcallClient }
        );

        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 30000);
        });

        // check migration index settings results:
        const latestIndexName = await getLatestIndexName(esClient, TEST_CA);
        console.log(`expecting to find 1 index ${latestIndexName}...`);
        expect(latestIndexName).to.not.equal("");

        const secondIndexName = generateIndexName(TEST_CA) + "re_2";
        expect(latestIndexName).to.equal(secondIndexName);

        const settings = await getIndexSettings(esClient, latestIndexName);
        const indexSettings = settings.body[latestIndexName].settings.index;
        const currentNumOfShards = parseInt(indexSettings.number_of_shards);
        const currentNumOfReplicas = parseInt(indexSettings.number_of_replicas);

        expect(currentNumOfReplicas).to.equal(
          donorIndexMapping.settings["index.number_of_replicas"]
        );
        expect(currentNumOfShards).to.equal(
          donorIndexMapping.settings["index.number_of_shards"]
        );

        // after migration, all documents from previous index should be reindexed to new index
        const test_ca_re_2_documents = (
          await esClient.search({
            index: latestIndexName,
            track_total_hits: true,
          })
        ).body?.hits?.total?.value;

        expect(test_ca_re_2_documents).to.equal(clinicalDataset.length);
      }
    );
    it("handles incremental analysis updates properly", async () => {
      await createIndexAndAlias(TEST_CA);
      // test donor DO35082 for incremental update:
      const testAnalysis = seqExpAnalyses[0];
      const testDonorId = testAnalysis.donors[0].donorId;

      await processClinicalUpdateEvent(
        {
          programId: TEST_US,
          type: KnownEventType.CLINICAL,
        },
        mockDlqSender,
        { esClient, rollcallClient }
      );
      // wait for indexing to complete
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      await processRdpcAnalysisUpdateEvent(
        {
          programId: TEST_CA,
          type: KnownEventType.RDPC,
          analysisId: testAnalysis.analysisId,
          rdpcGatewayUrls: [RDPC_URL],
        },
        mockDlqSender,
        {
          esClient,
          rollcallClient,
          analysesFetcher: mockAnalysisFetcher,
          analysesWithSpecimensFetcher: mockAnalysesWithSpecimensFetcher,
          fetchVC: mockVariantCallingFetcher,
          fetchDonorIds: () => Promise.resolve([testDonorId]),
        }
      );

      // wait for indexing to complete
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });

      const esHits = await Promise.all(
        testDonorIds.map(async (donorId) => {
          const esQuery = esb
            .requestBodySearch()
            .size(testDonorIds.length)
            .query(esb.termQuery("donorId", `DO${donorId}`));
          const esHit: EsHit = await esClient
            .search({
              index: ROLLCALL_ALIAS_NAME,
              body: esQuery,
            })
            .then((res) => res.body.hits.hits[0])
            .catch((err) => null);
          return esHit;
        })
      );

      esHits.forEach((hit) => {
        expect([
          hit._source.donorId,
          "alignmentsCompleted",
          hit._source.alignmentsCompleted,
        ]).to.deep.equal([
          hit._source.donorId,
          "alignmentsCompleted",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].alignmentsCompleted
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "alignmentsFailed",
          hit._source.alignmentsFailed,
        ]).to.deep.equal([
          hit._source.donorId,
          "alignmentsFailed",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].alignmentsFailed
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "alignmentsRunning",
          hit._source.alignmentsRunning,
        ]).to.deep.equal([
          hit._source.donorId,
          "alignmentsRunning",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].alignmentsRunning
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "sangerVcsCompleted",
          hit._source.sangerVcsCompleted,
        ]).to.deep.equal([
          hit._source.donorId,
          "sangerVcsCompleted",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].sangerVcsCompleted
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "sangerVcsFailed",
          hit._source.sangerVcsFailed,
        ]).to.deep.equal([
          hit._source.donorId,
          "sangerVcsFailed",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].sangerVcsFailed
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "sangerVcsRunning",
          hit._source.sangerVcsRunning,
        ]).to.deep.equal([
          hit._source.donorId,
          "sangerVcsRunning",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].sangerVcsRunning
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "mutectCompleted",
          hit._source.mutectCompleted,
        ]).to.deep.equal([
          hit._source.donorId,
          "mutectCompleted",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].mutectCompleted
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "mutectRunning",
          hit._source.mutectRunning,
        ]).to.deep.equal([
          hit._source.donorId,
          "mutectRunning",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].mutectRunning
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "mutectFailed",
          hit._source.mutectFailed,
        ]).to.deep.equal([
          hit._source.donorId,
          "mutectFailed",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].mutectFailed
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "openAccessCompleted",
          hit._source.openAccessCompleted,
        ]).to.deep.equal([
          hit._source.donorId,
          "openAccessCompleted",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].openAccessCompleted
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "openAccessRunning",
          hit._source.openAccessRunning,
        ]).to.deep.equal([
          hit._source.donorId,
          "openAccessRunning",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].openAccessRunning
            : 0,
        ]);
        expect([
          hit._source.donorId,
          "openAccessFailed",
          hit._source.openAccessFailed,
        ]).to.deep.equal([
          hit._source.donorId,
          "openAccessFailed",
          hit._source.donorId === testDonorId
            ? expectedRDPCData[hit._source.donorId].openAccessFailed
            : 0,
        ]);

        expect([
          hit._source.donorId,
          "sangerVcsFirstPublishedDate",
          hit._source.sangerVcsFirstPublishedDate,
        ]).to.deep.equal([
          hit._source.donorId,
          "sangerVcsFirstPublishedDate",
          expectedRDPCData[hit._source.donorId].sangerVcsFirstPublishedDate,
        ]);

        expect([
          hit._source.donorId,
          "mutectFirstPublishedDate",
          hit._source.mutectFirstPublishedDate,
        ]).to.deep.equal([
          hit._source.donorId,
          "mutectFirstPublishedDate",
          expectedRDPCData[hit._source.donorId].mutectFirstPublishedDate,
        ]);

        expect([
          hit._source.donorId,
          "openAccessFirstPublishedDate",
          hit._source.openAccessFirstPublishedDate,
        ]).to.deep.equal([
          hit._source.donorId,
          "openAccessFirstPublishedDate",
          expectedRDPCData[hit._source.donorId].openAccessFirstPublishedDate,
        ]);
      });
    });
  });
});
