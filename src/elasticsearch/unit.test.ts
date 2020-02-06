import { expect } from "chai";
import { initIndexMappping, toEsBulkIndexActions } from "./index";
import donorIndexMapping from "./donorIndexMapping.json";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
const TEST_INDEX = "test_index";

describe("toEsBulkIndexActions", () => {
  it("must transform properly", () => {
    const docs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(toEsBulkIndexActions(TEST_INDEX)(docs)).to.deep.equal([
      { index: { _index: TEST_INDEX } },
      { id: 1 },
      { index: { _index: TEST_INDEX } },
      { id: 2 },
      { index: { _index: TEST_INDEX } },
      { id: 3 }
    ]);
  });
});

describe("initIndexMappping", () => {
  let elasticsearchContainer: StartedTestContainer;
  const ES_PORT = 9200;
  let esClient: Client;
  before(async () => {
    try {
      elasticsearchContainer = await new GenericContainer(
        "elasticsearch",
        "7.5.0"
      )
        .withStartupTimeout(new Duration(120, TemporalUnit.SECONDS))
        .withExposedPorts(ES_PORT)
        .withEnv("discovery.type", "single-node")
        .start();
      const ES_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}:${elasticsearchContainer.getMappedPort(
        ES_PORT
      )}`;
      esClient = new Client({
        node: ES_HOST
      });
    } catch (err) {
      console.log(`before >>>>>>>>>>>`, err);
    }
  });
  after(async () => {
    await elasticsearchContainer.stop();
  });
  beforeEach(async () => {
    await esClient.indices.create({
      index: TEST_INDEX
    });
  });
  afterEach(async () => {
    await esClient.indices.delete({
      index: TEST_INDEX
    });
  });
  it("must puts index mappping properly", async () => {
    await initIndexMappping(TEST_INDEX, esClient);
    const { body: exists } = await esClient.indices.exists({
      index: TEST_INDEX
    });
    const mappingResponse = await esClient.indices.getMapping({
      index: TEST_INDEX
    });
    expect(mappingResponse.body).to.deep.equal({
      [TEST_INDEX]: donorIndexMapping
    });
    expect(exists).to.be.true;
  });
});
