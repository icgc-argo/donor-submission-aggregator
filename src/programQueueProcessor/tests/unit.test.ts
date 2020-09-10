import { expect } from "chai";
import { GenericContainer } from "testcontainers";
import { StartedTestContainer, Wait } from "testcontainers";
import { promisify } from "util";
import { exec } from "child_process";
import DonorSchema from "donorModel";
import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
import KafkaMock from "./kafkaMock";
import createProgramQueueProcessor from "../index";
import { RollCallClient } from "../../rollCall/types";
import createRollCallClient from "../../rollCall";

const TEST_PROGRAM_SHORT_NAME = "MINH-CA";
const DB_COLLECTION_SIZE = 10010;
const TARGET_ES_INDEX = "test_prog";
const asyncExec = promisify(exec);

describe("programQueueProcessor", () => {
  /******* Containers ********/
  let mongoContainer: StartedTestContainer;
  let elasticsearchContainer: StartedTestContainer;
  let rollcallContainer: StartedTestContainer;
  /***************************/

  /******** Clients *********/
  let esClient: Client;
  let rollcallClient: RollCallClient;
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
  const NETOWRK_MODE = "host";
  const ALIAS_NAME = "file_centric";
  let MONGO_URL: string;
  /****************************/

  before(async () => {
    try {
      // ***** start relevant servers *****
      [mongoContainer, elasticsearchContainer] = await Promise.all([
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
      ]);

      const ES_MAPPED_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}`;
      const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;

      console.log("ES_HOST: ", ES_HOST);

      rollcallContainer = await new GenericContainer(
        "overture/rollcall",
        "2.0.0"
      )
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
        .withEnv("ROLLCALL_ALIASES_0_ENTITY", `${RESOLVED_INDEX_PARTS.entity}`)
        .withEnv("ROLLCALL_ALIASES_0_TYPE", `${RESOLVED_INDEX_PARTS.type}`)
        .withWaitStrategy(Wait.forLogMessage("Started RollcallApplication"))
        .start();

      const ROLLCALL_HOST = `http://${rollcallContainer.getContainerIpAddress()}:${ROLLCALL_PORT}`;
      console.log("ROLLCALL_HOST: ", ROLLCALL_HOST);

      // ***** start relevant clients *****
      esClient = new Client({ node: ES_HOST });
      rollcallClient = createRollCallClient({
        url: `${ROLLCALL_HOST}`,
        ...RESOLVED_INDEX_PARTS,
        aliasName: ALIAS_NAME,
      });
      MONGO_URL = `mongodb://${mongoContainer.getContainerIpAddress()}:${mongoContainer.getMappedPort(
        MONGO_PORT
      )}/clinical`;
      await mongoose.connect(MONGO_URL);
    } catch (err) {
      console.log(`before >>>>>>>>>>>`, err);
    }
  });
  after(async () => {
    await mongoContainer.stop();
    await elasticsearchContainer.stop();
    await rollcallContainer.stop();
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
      const kafka = new KafkaMock({
        brokers: [],
        clientId: "test",
        topics: {},
      });
      const programQueueProcessor = await createProgramQueueProcessor({
        kafka: kafka as any,
        esClient,
        rollCallClient: rollcallClient,
        queueInitializer: async (kafka) => {
          return "";
        },
      });
      programQueueProcessor.enqueueEvent({
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
        }, 5000);
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
