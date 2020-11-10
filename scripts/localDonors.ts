import mongoose from "mongoose";
import { MONGO_URL } from "../src/config";
import range from "lodash/range";

import {
  Donor,
  Donor_new,
} from "../src/indexClinicalData/clinicalMongo/donorModel/types";
import donorModel from "../src/indexClinicalData/clinicalMongo/donorModel";
import createLocalDonors from "./createLocalDonors";
import { donorIds } from "../src/rdpc/fixtures/PACA-CA_donorIds";

const PROGRAM_SHORT_NAME = process.env.PROGRAM_SHORT_NAME || "TEST-CA";
const donors: Donor_new[] = donorIds.map((donorId) =>
  createLocalDonors(PROGRAM_SHORT_NAME, donorId)
);

(async () => {
  await mongoose.connect(MONGO_URL, {
    autoReconnect: true,
    // http://mongodb.github.io/node-mongodb-native/3.1/reference/faq/
    socketTimeoutMS: 10000,
    connectTimeoutMS: 30000,
    keepAlive: true,
    reconnectTries: 10,
    reconnectInterval: 3000,
    bufferCommands: false,
    bufferMaxEntries: 0,
    useNewUrlParser: true,
    useFindAndModify: false,
  });
  console.log(`connected to mongo at ${MONGO_URL}`);
  await donorModel().insertMany(donors);
  const written = await donorModel().find({});
  console.log(`finished creating ${written.length} local donors`);
})().then(() => {
  mongoose.disconnect();
});
