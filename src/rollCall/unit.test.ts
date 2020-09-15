import { expect } from "chai";
import createRollcallClient from "./index";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
import { RollCallClient } from "./types";

describe("rollcall integration", () => {
  let elasticsearchContainer: StartedTestContainer;
  let rollcallContainer: StartedTestContainer;
  let esClient: Client;
  let rollcallClient: RollCallClient;

  const ES_PORT = 10092;
  const ROLLCALL_PORT = 10091;
  const TEST_PROGRAM = "TEST-CA";
  // the network has to exist before the tests are run because there are containers talking to each other
  // "host" is a default docker network, if the network is changed, make sure the new network exists
  const NETOWRK_MODE = "host";

  const RESOLVED_INDEX_PARTS = {
    entity: "file",
    type: "centric",
    shardPrefix: "pgm",
    releasePrefix: "re",
  };

  const aliasName = "file_centric";

  before(async () => {
    try {
      // ***** start relevant servers *****
      elasticsearchContainer = await new GenericContainer(
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
        .withWaitStrategy(Wait.forHealthCheck())
        .start();

      const ES_MAPPED_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}`;
      const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;

      rollcallContainer = await new GenericContainer(
        "overture/rollcall",
        "2.4.0"
      )
        .withNetworkMode(NETOWRK_MODE)
        .withExposedPorts(ROLLCALL_PORT)
        .withEnv("SPRING_PROFILES_ACTIVE", "test")
        .withEnv("SERVER_PORT", `${ROLLCALL_PORT}`)
        .withEnv("SPRING_CLOUD_VAULT_ENABLED", `${false}`)
        .withEnv("ELASTICSEARCH_NODE", `${ES_HOST}`)
        .withEnv(
          "ROLLCALL_AzzLIASES_0_ALIAS",
          `${RESOLVED_INDEX_PARTS.entity}_${RESOLVED_INDEX_PARTS.type}`
        )
        .withEnv("ROLLCALL_ALIASES_0_ENTITY", `${RESOLVED_INDEX_PARTS.entity}`)
        .withEnv("ROLLCALL_ALIASES_0_TYPE", `${RESOLVED_INDEX_PARTS.type}`)
        .withWaitStrategy(Wait.forLogMessage("Started RollcallApplication"))
        .start();

      const ROLLCALL_HOST = `http://${rollcallContainer.getContainerIpAddress()}:${ROLLCALL_PORT}`;

      // ***** start relevant clients *****
      esClient = new Client({ node: ES_HOST });
      rollcallClient = createRollcallClient({
        url: `${ROLLCALL_HOST}`,
        ...RESOLVED_INDEX_PARTS,
        aliasName,
      });
    } catch (err) {
      console.log(`before >>>>>>>>>>>`, err);
    }
  });

  after(async () => {
    await elasticsearchContainer.stop();
    await rollcallContainer.stop();
  });

  it("should create new indices and release them", async () => {
    // ask rollcall to create a new index in elasticsearch for TEST_PROGRAM
    const newResolvedIndex = await rollcallClient.createNewResolvableIndex(
      TEST_PROGRAM
    );
    const newIndexName = newResolvedIndex.indexName;
    console.log(JSON.stringify(newResolvedIndex, null, 2));
    expect(newResolvedIndex).to.contain({
      ...RESOLVED_INDEX_PARTS,
      shard: "testca",
      release: "1",
    });

    // check elastic search has new index
    const { body: exists } = await esClient.indices.exists({
      index: newIndexName,
    });
    expect(exists).to.be.true;

    // ask rollcall to reelase the new index
    const releasedNewIndex = await rollcallClient.release(newResolvedIndex);
    expect(releasedNewIndex).to.be.true;

    // check released index has alias
    const { body } = await esClient.cat.aliases({
      name: aliasName,
      format: "JSON",
      h: ["alias", "index"],
    });
    expect(body).to.deep.include({ alias: aliasName, index: newIndexName });
  });
});
