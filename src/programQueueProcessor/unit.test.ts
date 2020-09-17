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
import createProgramQueueProcessor from "./index";
import { RollCallClient } from "../rollCall/types";
import createRollCallClient from "../rollCall";
import { Kafka } from "kafkajs";
import { ProgramQueueProcessor } from "./types";

const TEST_PROGRAM_SHORT_NAME = "TESTPROG-CA";
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
  const ZOOKEEPER_PORT = 2181;
  const KAFKA_PORT = 9092;
  const NETOWRK_MODE = "host";
  const ALIAS_NAME = "donor_centric";
  let MONGO_URL: string;
  let KAFKA_HOST: string;
  /****************************/

  /******* Containers ********/
  let startedMongoContainer: StartedTestContainer;
  let startedElasticsearchContainer: StartedTestContainer;
  let startedRollcallContainer: StartedTestContainer;
  let startedZookeeperContainer: StartedTestContainer;
  let startedKafkaContainer: StartedTestContainer;
  /***************************/

  /******** Clients *********/
  let esClient: Client;
  let rollcallClient: RollCallClient;
  let kafkaClient: Kafka;
  /**************************/

  let programQueueProcessor: ProgramQueueProcessor;

  before(async () => {
    const mongoContainer = new GenericContainer("mongo").withExposedPorts(
      MONGO_PORT
    );
    const elasticsearchContainer = new GenericContainer(
      "elasticsearch",
      "7.5.0"
    )
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
      .withWaitStrategy(Wait.forHealthCheck());
    // const zookeeperContainer = new GenericContainer(
    //   "wurstmeister/zookeeper",
    //   "latest"
    // )
    //   .withNetworkMode(NETOWRK_MODE)
    //   .withExposedPorts(ZOOKEEPER_PORT);

    try {
      // ***** start relevant servers *****
      [
        startedMongoContainer,
        startedElasticsearchContainer,
        // startedZookeeperContainer,
      ] = await Promise.all([
        mongoContainer.start(),
        elasticsearchContainer.start(),
        // zookeeperContainer.start(),
      ]);

      const ES_MAPPED_HOST = `http://${startedElasticsearchContainer.getContainerIpAddress()}`;
      const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;
      // const ZOOKEEPER_HOST = `${startedZookeeperContainer.getContainerIpAddress()}:${ZOOKEEPER_PORT}`;

      const rollcallContainer = new GenericContainer(
        "overture/rollcall",
        "2.4.0"
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
        .withWaitStrategy(Wait.forLogMessage("Started RollcallApplication"));
      // const kafkaContainer = new GenericContainer(
      //   "confluentinc/cp-kafka",
      //   "5.2.1"
      // )
      //   .withNetworkMode(NETOWRK_MODE)
      //   .withExposedPorts(29092, KAFKA_PORT)
      //   .withEnv("KAFKA_BROKER_ID", "1")
      //   .withEnv("KAFKA_ZOOKEEPER_CONNECT", ZOOKEEPER_HOST)
      //   .withEnv(
      //     "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP",
      //     "PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
      //   )
      //   .withEnv(
      //     "KAFKA_ADVERTISED_LISTENERS",
      //     `PLAINTEXT://localhost:29092,PLAINTEXT_HOST://localhost:${KAFKA_PORT}`
      //   )
      //   .withEnv("KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", "1")
      //   .withEnv("KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS", "0")
      //   .withEnv(
      //     "CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS",
      //     "localhost:29092"
      //   )
      //   .withEnv("CONFLUENT_METRICS_REPORTER_ZOOKEEPER_CONNECT", ZOOKEEPER_HOST)
      //   .withWaitStrategy(Wait.forLogMessage("Startup complete"));
      const kafkaContainer = new GenericContainer("spotify/kafka", "latest")
        .withNetworkMode(NETOWRK_MODE)
        .withExposedPorts(KAFKA_PORT);

      console.log("ZOOKEEPER_HOST: ", ZOOKEEPER_HOST);
      console.log("ES_HOST: ", ES_HOST);

      await new Promise((resolve) => {
        console.log(`awaiting zookeeper`);
        setTimeout(() => {
          console.log(`continuing`);
          resolve();
        }, 30000);
      });

      [startedRollcallContainer, startedKafkaContainer] = await Promise.all([
        rollcallContainer.start(),
        kafkaContainer.start(),
      ]);

      const ROLLCALL_HOST = `http://${startedRollcallContainer.getContainerIpAddress()}:${ROLLCALL_PORT}`;
      console.log("ROLLCALL_HOST: ", ROLLCALL_HOST);
      KAFKA_HOST = `${startedKafkaContainer.getContainerIpAddress()}:${KAFKA_PORT}`;
      console.log("KAFKA_HOST: ", KAFKA_HOST);

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
        ],
      });
      await kafkaAdmin.disconnect();
      MONGO_URL = `mongodb://${startedMongoContainer.getContainerIpAddress()}:${startedMongoContainer.getMappedPort(
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
      startedMongoContainer?.stop(),
      startedElasticsearchContainer?.stop(),
      startedRollcallContainer?.stop(),
      startedZookeeperContainer?.stop(),
      startedKafkaContainer?.stop(),
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
    console.log("programQueueProcessor: ", programQueueProcessor);
    await programQueueProcessor?.destroy();
  });

  describe("programQueueProcessor", () => {
    it("must index all data into Elasticsearch", async function () {
      programQueueProcessor = await createProgramQueueProcessor({
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
      // wait for indexing to complete
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 30000);
      });
      const totalEsDocuments = (
        await esClient.search({
          index: ALIAS_NAME,
          track_total_hits: true,
        })
      ).body?.hits?.total?.value;
      expect(totalEsDocuments).to.equal(DB_COLLECTION_SIZE);
    });
  });
});
