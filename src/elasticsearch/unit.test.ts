import { expect } from "chai";
import { initIndexMapping, toEsBulkIndexActions } from "./index";
import donorIndexMapping from "./donorIndexMapping.json";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { Client } from "@elastic/elasticsearch";
import { Duration, TemporalUnit } from "node-duration";
const TEST_INDEX = "test_index";

describe("toEsBulkIndexActions", () => {
  it("must transform properly", () => {
    const docs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(
      toEsBulkIndexActions<typeof docs[0]>(TEST_INDEX, (doc) => String(doc.id))(
        docs
      )
    ).to.deep.equal([
      { index: { _index: TEST_INDEX, _id: "1" } },
      { id: 1 },
      { index: { _index: TEST_INDEX, _id: "2" } },
      { id: 2 },
      { index: { _index: TEST_INDEX, _id: "3" } },
      { id: 3 },
    ]);
  });
});

describe("initIndexMapping", () => {
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
        node: ES_HOST,
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
      index: TEST_INDEX,
    });
  });
  afterEach(async () => {
    await esClient.indices.delete({
      index: TEST_INDEX,
    });
  });
  it.only("must initialize index mappping properly", async () => {
    try {
      await esClient.indices.close({
        index: TEST_INDEX,
      });
    } catch (error) {
      console.log(`close index --- ${error}`);
    }

    try {
      await esClient.indices.putSettings({
        index: TEST_INDEX,
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
      console.log(`putsettings---- ${JSON.stringify(error)}`);
    }

    try {
      await esClient.indices.open({
        index: TEST_INDEX,
      });
    } catch (error) {
      console.log(`open index --- ${error}`);
    }

    await initIndexMapping(TEST_INDEX, esClient);
    const { body: exists } = await esClient.indices.exists({
      index: TEST_INDEX,
    });
    expect(exists).to.be.true;

    const mappingResponse = await esClient.indices.getMapping({
      index: TEST_INDEX,
    });

    console.log("unit -----------" + JSON.stringify(mappingResponse));

    console.log("+++++" + JSON.stringify(donorIndexMapping.mappings));

    expect(mappingResponse.body[TEST_INDEX].mappings).to.deep.equal(
      donorIndexMapping.mappings
    );
  });
});
