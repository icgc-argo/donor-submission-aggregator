import { CLINICAL_PROGRAM_UPDATE_TOPIC } from "config";
import { expect } from "chai";
import { GenericContainer } from "testcontainers";
import { StartedTestContainer, Wait } from "testcontainers";
import { promisify } from "util";
import { exec } from "child_process";
import DonorSchema from "donorModel";
import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
import createProgramQueueProcessor from "../index";
import { RollCallClient } from "../../rollCall/types";
import createRollCallClient from "../../rollCall";
import { Kafka } from "kafkajs";

const TEST_PROGRAM_SHORT_NAME = "MINH-CA";
const DB_COLLECTION_SIZE = 10010;
const TARGET_ES_INDEX = "test_prog";
const asyncExec = promisify(exec);

describe("programQueueProcessor", () => {
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
    entity: "file",
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
        new GenericContainer("overture/rollcall", "2.0.0")
          .withNetworkMode(NETOWRK_MODE)
          .withExposedPorts(ROLLCALL_PORT)
          .withEnv("SPRING_PROFILES_ACTIVE", "test")
          .withEnv("SERVER_PORT", `${ROLLCALL_PORT}`)
          .withEnv("ELASTICSEARCH_HOST", `${ES_MAPPED_HOST}`)
          .withEnv("ELASTICSEARCH_PORT", `${ES_PORT}`)
          .withEnv(
            "ROLLCALL_ALIASES_0_ALIAS",
            `${RESOLVED_INDEX_PARTS.entity}_${RESOLVED_INDEX_PARTS.type}`
          )
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
      kafkaClient = new Kafka({
        clientId: `donor-submission-aggregator`,
        brokers: [KAFKA_HOST],
      });
      const kafkaAdmin = kafkaClient.admin();
      kafkaAdmin.connect();
      kafkaAdmin.createTopics({
        topics: [
          {
            topic: CLINICAL_PROGRAM_UPDATE_TOPIC,
            numPartitions: 5,
          },
        ],
      });
      kafkaAdmin.disconnect();
      MONGO_URL = `mongodb://${mongoContainer.getContainerIpAddress()}:${mongoContainer.getMappedPort(
        MONGO_PORT
      )}/clinical`;
      await mongoose.connect(MONGO_URL);
    } catch (err) {
      console.log(`before >>>>>>>>>>>`, err);
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
    await esClient.indices.create({
      index: TARGET_ES_INDEX,
    });
  });
  afterEach(async function () {
    await DonorSchema().deleteMany({});
    await esClient.indices.delete({
      index: TARGET_ES_INDEX,
    });
  });

  describe("programQueueProcessor", () => {
    it("must index all data into Elasticsearch", async function () {
      // const kafka = new KafkaMock({
      //   brokers: [],
      //   clientId: "test",
      //   topics: {},
      // });
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      });
      const programQueueProcessor = await createProgramQueueProcessor({
        kafka: kafkaClient,
        esClient,
        rollCallClient: rollcallClient,
      });
      await programQueueProcessor.enqueueEvent({
        programId: TEST_PROGRAM_SHORT_NAME,
        changes: [
          {
            source: programQueueProcessor.knownEventSource.CLINICAL,
          },
        ],
      });
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 10000);
      });
      const totalEsDocuments = (
        await esClient.search({
          index: TARGET_ES_INDEX,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments).to.equal(DB_COLLECTION_SIZE);
    });
  });
});
