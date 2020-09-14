import { CLINICAL_PROGRAM_UPDATE_TOPIC, ROLLCALL_ALIAS_NAME } from "config";
import { expect } from "chai";
import { GenericContainer } from "testcontainers";
import { StartedTestContainer, Wait } from "testcontainers";
import { promisify } from "util";
import { exec } from "child_process";
import DonorSchema from "donorModel";
import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
import createProgramQueueProcessor, {
  TestEventProcessedPayload,
} from "./index";
import { RollCallClient } from "../rollCall/types";
import createRollCallClient from "../rollCall";
import { Kafka } from "kafkajs";

const TEST_PROGRAM_SHORT_NAME = "MINH-CA";
const DB_COLLECTION_SIZE = 10010;
const asyncExec = promisify(exec);

describe("kafka integration", () => {
  /******* Containers ********/
  let mongoContainer: StartedTestContainer;
  let elasticsearchContainer: StartedTestContainer;
  let rollcallContainer: StartedTestContainer;
  let zookeeperContainer: StartedTestContainer;
  let kafkaContainer: StartedTestContainer;
  /***************************/

  /******** Clients *********/
  let esClient: Client;
  let rollcallClient: RollCallClient;
  let kafkaClient: Kafka;
  /**************************/

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
  const ZOOKEEPER_PORT = 2181;
  const KAFKA_PORT = 9092;
  const NETOWRK_MODE = "host";
  const ALIAS_NAME = "file_centric";
  let MONGO_URL: string;
  let KAFKA_HOST: string;
  /****************************/

  let programQueueProcessor: ReturnType<typeof createProgramQueueProcessor>;

  before(async () => {
    try {
      // ***** start relevant servers *****
      [
        mongoContainer,
        elasticsearchContainer,
        zookeeperContainer,
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
        new GenericContainer("wurstmeister/zookeeper", "latest")
          .withNetworkMode(NETOWRK_MODE)
          .withExposedPorts(ZOOKEEPER_PORT)
          .start(),
      ]);

      const ES_MAPPED_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}`;
      const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;
      const ZOOKEEPER_HOST = `${zookeeperContainer.getContainerIpAddress()}:${ZOOKEEPER_PORT}`;

      console.log("ZOOKEEPER_HOST: ", ZOOKEEPER_HOST);
      console.log("ES_HOST: ", ES_HOST);

      [rollcallContainer, kafkaContainer] = await Promise.all([
        new GenericContainer("overture/rollcall", "2.4.0")
          .withNetworkMode(NETOWRK_MODE)
          .withExposedPorts(ROLLCALL_PORT)
          .withEnv("SPRING_PROFILES_ACTIVE", "test")
          .withEnv("SERVER_PORT", `${ROLLCALL_PORT}`)
          .withEnv("ELASTICSEARCH_NODE", `${ES_HOST}`)
          .withEnv("ROLLCALL_ALIASES_0_ALIAS", `${ROLLCALL_ALIAS_NAME}`)
          .withEnv(
            "ROLLCALL_ALIASES_0_ENTITY",
            `${RESOLVED_INDEX_PARTS.entity}`
          )
          .withEnv("ROLLCALL_ALIASES_0_TYPE", `${RESOLVED_INDEX_PARTS.type}`)
          .withWaitStrategy(Wait.forLogMessage("Started RollcallApplication"))
          .start(),
        new GenericContainer("confluentinc/cp-kafka", "5.2.1")
          .withNetworkMode(NETOWRK_MODE)
          .withExposedPorts(29092, KAFKA_PORT)
          .withEnv("KAFKA_BROKER_ID", "1")
          .withEnv("KAFKA_ZOOKEEPER_CONNECT", ZOOKEEPER_HOST)
          .withEnv(
            "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP",
            "PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
          )
          .withEnv(
            "KAFKA_ADVERTISED_LISTENERS",
            `PLAINTEXT://localhost:29092,PLAINTEXT_HOST://localhost:${KAFKA_PORT}`
          )
          .withEnv("KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", "1")
          .withEnv("KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS", "0")
          .withEnv(
            "CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS",
            "localhost:29092"
          )
          .withEnv(
            "CONFLUENT_METRICS_REPORTER_ZOOKEEPER_CONNECT",
            ZOOKEEPER_HOST
          )
          .start(),
      ]);

      const ROLLCALL_HOST = `http://${rollcallContainer.getContainerIpAddress()}:${ROLLCALL_PORT}`;
      console.log("ROLLCALL_HOST: ", ROLLCALL_HOST);
      KAFKA_HOST = `${kafkaContainer.getContainerIpAddress()}:${KAFKA_PORT}`;
      console.log("KAFKA_HOST: ", KAFKA_HOST);

      // ***** start relevant clients *****
      esClient = new Client({ node: ES_HOST });
      rollcallClient = createRollCallClient({
        url: `${ROLLCALL_HOST}`,
        ...RESOLVED_INDEX_PARTS,
        aliasName: ALIAS_NAME,
      });
      // Needs to wait for kafka to come up...
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      });
      kafkaClient = new Kafka({
        clientId: `donor-submission-aggregator-test`,
        brokers: [KAFKA_HOST],
      });
      const kafkaAdmin = kafkaClient.admin();
      await kafkaAdmin.connect();
      await kafkaAdmin.createTopics({
        topics: [
          {
            topic: CLINICAL_PROGRAM_UPDATE_TOPIC,
            numPartitions: 5,
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
  after(async () => {
    await Promise.all([
      mongoContainer?.stop(),
      elasticsearchContainer?.stop(),
      rollcallContainer?.stop(),
      zookeeperContainer?.stop(),
      kafkaContainer?.stop(),
    ]);
  });
  beforeEach(async function () {
    const { stdout } = await asyncExec(
      `PROGRAM_SHORT_NAME=${TEST_PROGRAM_SHORT_NAME} COLLECTION_SIZE=${DB_COLLECTION_SIZE} MONGO_URL=${MONGO_URL} npm run createMongoDonors`
    );
    console.log("beforeEach >>>>>>>>>>>", stdout);
  });
  afterEach(async function () {
    await DonorSchema().deleteMany({});
    await (await programQueueProcessor)?.destroy();
  });

  describe("program queue processor", () => {
    it("must index all data into Elasticsearch", async function () {
      const { processor, processedEvent } = await new Promise<{
        processor: ReturnType<typeof createProgramQueueProcessor>;
        processedEvent: TestEventProcessedPayload;
      }>(async (resolve) => {
        const programQueueProcessor = createProgramQueueProcessor({
          kafka: kafkaClient,
          esClient,
          rollCallClient: rollcallClient,
          test_onEventProcessed: async (event) => {
            resolve({
              processor: programQueueProcessor,
              processedEvent: event,
            });
          },
        });
        (await programQueueProcessor).enqueueEvent({
          programId: TEST_PROGRAM_SHORT_NAME,
          changes: [
            {
              source: (await programQueueProcessor).knownEventSource.CLINICAL,
            },
          ],
        });
      });
      programQueueProcessor = processor;
      const totalEsDocuments = (
        await esClient.search({
          index: ROLLCALL_ALIAS_NAME,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments).to.equal(DB_COLLECTION_SIZE);
    });
  });
});
