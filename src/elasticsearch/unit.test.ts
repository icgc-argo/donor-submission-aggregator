import { expect } from "chai";
import { initIndexMappping, esClient, toEsBulkIndexActions } from "./index";
import donorIndexMapping from "./donorIndexMapping.json";

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
  beforeEach(async function() {
    this.timeout(10000);
    await esClient.indices.create({
      index: TEST_INDEX
    });
  });
  afterEach(async function() {
    this.timeout(10000);
    await esClient.indices.delete({
      index: TEST_INDEX
    });
  });

  it("must puts index mappping properly", async () => {
    await initIndexMappping(TEST_INDEX);
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
