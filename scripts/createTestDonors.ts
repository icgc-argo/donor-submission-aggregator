import mongoose from "mongoose";
import { MONGO_URL } from "../src/config";
import { Donor } from "../src/indexClinicalData/clinicalMongo/donorModel/types";
import { testDonorIds } from "../src/rdpc/fixtures/integrationTest/dataset";
import { insertDonors } from "./createMongoDonors";
import createDonor from "./createDonor";

const createTestDonors = async () => {
  const PROGRAM_SHORT_NAME = process.env.PROGRAM_SHORT_NAME || "TEST-CA";

  // integration testing donors:
  const testingDonors: Donor[] = testDonorIds.map((donorId) =>
    createDonor(PROGRAM_SHORT_NAME, parseInt(donorId))
  );

  await insertDonors(testingDonors);
};

createTestDonors();
