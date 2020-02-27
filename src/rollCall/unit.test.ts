import { expect } from "chai";
import { RollcallClient } from "./index";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
import { ResolvedIndex } from './types';

const TEST_INDEX = "file_centric_sh_shardA_re_1";

describe("rollcall integration", () => {
  let elasticsearchContainer: StartedTestContainer;
  let rollcallContainer: StartedTestContainer;
  let esClient: Client;
  let rollcallClient: RollcallClient;

  const ES_PORT = 9200;
  const ROLLCALL_PORT = 9001;
  const TEST_PROGRAM = "TEST-CA";
  // the network has to exist before the tests are run in this file because there are containers talking to each other
  // "host" is a default docker network that is always available, if the network name is changed, make sure the new network exists
  const NETOWRK_NAME = "host";

  const RESOLVED_INDEX_PARTS = {
    entity: "file",
    type: "centric",    
    shardPrefix: "pgm",
    releasePrefix: "re"
  }

  before(async () => {
    try {

      // ***** start relevant servers *****
      elasticsearchContainer = await new GenericContainer(
        "elasticsearch",
        "7.5.0"
      )
        // .withName('aggregator_elasticsearch')
        .withNetworkMode(NETOWRK_NAME)
        // .withNetworkMode("bridge")
        .withStartupTimeout(new Duration(120, TemporalUnit.SECONDS))
        .withExposedPorts(ES_PORT)
        .withEnv("discovery.type", "single-node")
        .start();
    
      const ES_MAPPED_PORT = `${elasticsearchContainer.getMappedPort(ES_PORT)}`;
      const ES_MAPPED_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}`;
      const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;

      rollcallContainer = await new GenericContainer("overture/rollcall", "2.0.0")
        .withNetworkMode(NETOWRK_NAME)
        .withExposedPorts(ROLLCALL_PORT)
        .withEnv("SPRING_PROFILES_ACTIVE","test")
        .withEnv("SERVER_PORT", `${ROLLCALL_PORT}`)
        .withEnv("ELASTICSEARCH_HOST", `${ES_MAPPED_HOST}`)
        .withEnv("ELASTICSEARCH_PORT", `${ES_PORT}`)
        .withEnv("ROLLCALL_ALIASES_0_ALIAS", `${RESOLVED_INDEX_PARTS.entity}_${RESOLVED_INDEX_PARTS.type}`)
        .withEnv("ROLLCALL_ALIASES_0_ENTITY", `${RESOLVED_INDEX_PARTS.entity}`)
        .withEnv("ROLLCALL_ALIASES_0_TYPE", `${RESOLVED_INDEX_PARTS.type}`)
        .withWaitStrategy(Wait.forLogMessage('Started RollcallApplication'))
        .start();

      const ROLLCALL_HOST = `http://${rollcallContainer.getContainerIpAddress()}:${ROLLCALL_PORT}`;


      // ***** start relevant clients *****
      esClient = new Client({ node: ES_HOST });
      rollcallClient = new RollcallClient({ url: `${ROLLCALL_HOST}`, ...RESOLVED_INDEX_PARTS});  
       
    } catch (err) {
      console.log(`before >>>>>>>>>>>`, err);
    }
  });

  after(async () => {
    await elasticsearchContainer.stop();
    await rollcallContainer.stop();
  });

  it("should create new indices", async () => {
    const newResolvedIndex = await rollcallClient.createNewResolvableIndex(TEST_PROGRAM);
    console.log(JSON.stringify(newResolvedIndex));
    expect(newResolvedIndex).to.contain({...RESOLVED_INDEX_PARTS, shard: "testca", release: "1"});
   });

});
