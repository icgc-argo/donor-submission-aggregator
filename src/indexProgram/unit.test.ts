import { expect } from "chai";
import indexProgram from "indexProgram";
import { promisify } from "util";
import { exec } from "child_process";
import connectMongo from "connectMongo";
import DonorSchema from "donorModel";
import mongoose from "mongoose";

const TEST_PROGRAM_SHORT_NAME = "MINH-CA";
const asyncExec = promisify(exec);

describe("indexProgram", () => {
  beforeEach(async function() {
    this.timeout(10000);
    console.log("====== INITIALIZATION ======");
    const { stdout } = await asyncExec(
      `PROGRAM_SHORT_NAME=${TEST_PROGRAM_SHORT_NAME} npm run createMongoDonors`
    );
    console.log(stdout);
    await connectMongo();
    console.log("====== INITIALIZATION COMPLETE ======");
  });
  afterEach(async function() {
    console.log("====== CLEAN UP ======");
    DonorSchema.deleteMany({}, async () => {
      await mongoose.disconnect();
      console.log("====== CLEAN UP COMPLETE ======");
    });
  });

  it("must index not fail", () => {
    expect(() => indexProgram(TEST_PROGRAM_SHORT_NAME)).to.not.throw();
  });
});
