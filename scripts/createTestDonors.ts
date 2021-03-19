import mongoose from "mongoose";
import { MONGO_URL } from "../src/config";
import donorModel, {
  MongoDonorDocument,
} from "../src/indexClinicalData/clinicalMongo/donorModel";
import { testDonorIds } from "../src/rdpc/test/fixtures/integrationTest/dataset";
import createDonor from "./createDonor";

const PROGRAM_SHORT_NAME = process.env.PROGRAM_SHORT_NAME || "TEST-CA";

// integration testing donors:
const testingDonors: MongoDonorDocument[] = testDonorIds.map((donorId) =>
  createDonor(PROGRAM_SHORT_NAME, parseInt(donorId))
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
  await donorModel().insertMany(testingDonors);
  const written = await donorModel().find({});
  console.log(`finished creating ${written.length} local donors`);
})().then(() => {
  mongoose.disconnect();
});
