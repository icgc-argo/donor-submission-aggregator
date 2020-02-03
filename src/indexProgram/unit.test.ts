import { expect } from "chai";
import indexProgram from "indexProgram";

const TEST_PROGRAM_SHORT_NAME = "TEST_CA";

describe("indexProgram", () => {
  it("must index program properly", () => {
    expect(() => indexProgram(TEST_PROGRAM_SHORT_NAME)).to.not.throw();
  });
});
