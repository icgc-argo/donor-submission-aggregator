import { expect } from "chai";
import indexProgram from "indexProgram";
import { promisify } from "util";
import { exec } from "child_process";

const TEST_PROGRAM_SHORT_NAME = "MINH-CA";
const asyncExec = promisify(exec);

describe("indexProgram", () => {
  before(async function() {
    this.timeout(10000);
    console.log("====== INITIALIZATION ======");
    const { stdout } = await asyncExec(
      `PROGRAM_SHORT_NAME=${TEST_PROGRAM_SHORT_NAME} npm run createMongoDonors`
    );
    console.log(stdout);
    console.log("====== INITIALIZATION COMPLETE ======");
  });
  after(async function() {});
  it("must index program properly", () => {
    expect(() => indexProgram(TEST_PROGRAM_SHORT_NAME)).to.not.throw();
  });
});
