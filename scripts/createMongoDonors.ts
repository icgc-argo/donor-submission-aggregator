import mongoose from "mongoose";
import { MONGO_URL } from "../src/config";
import range from "lodash/range";

import { Donor } from "../src/donorModel/types";
import donorModel from "../src/donorModel";
import createDonor from "./createDonor";

const PROGRAM_SHORT_NAME = process.env.PROGRAM_SHORT_NAME || "TEST-CA";
const donors: Donor[] = range(0, 10000).map(() =>
  createDonor(PROGRAM_SHORT_NAME)
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
    useFindAndModify: false
  });
  console.log(`connected to mongo at ${MONGO_URL}`);
  await donorModel.insertMany(donors);
  console.log(`finished writing ${donors.length} donors`);
})().then(() => {
  mongoose.disconnect();
});
