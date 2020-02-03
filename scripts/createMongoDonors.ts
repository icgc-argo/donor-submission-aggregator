import mongoose from "mongoose";
import { MONGO_PASS, MONGO_URL, MONGO_USER } from "../src/config";
import range from "lodash/range";
import uuid from "uuid";

import { Donor } from "../src/donorModel/types";
import donorModel from "../src/donorModel";

const PROGRAM_SHORT_NAME = process.env.PROGRAM_SHORT_NAME || "TEST-CA";
const donors: Donor[] = range(0, 10000).map(i => {
  const submitterId = uuid();
  return {
    programId: PROGRAM_SHORT_NAME,
    gender: "female",
    submitterId: submitterId,
    createdAt: new Date().toString(),
    updatedAt: new Date().toString(),
    donorId: Math.random(),
    schemaMetadata: {
      isValid: true,
      lastValidSchemaVersion: "",
      originalSchemaVersion: "",
      lastMigrationId: uuid()
    },
    clinicalInfo: {},
    primaryDiagnosis: {
      clinicalInfo: {}
    },
    specimens: [
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 }
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: ""
      },
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 }
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: ""
      },
      {
        clinicalInfo: {},
        samples: [
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 },
          { sampleType: "", submitterId: submitterId, sampleId: 2 }
        ],
        specimenTissueSource: "",
        specimenType: "",
        submitterId: submitterId,
        tumourNormalDesignation: ""
      }
    ],
    followUps: [
      {
        clinicalInfo: {}
      }
    ],
    treatments: [
      {
        clinicalInfo: {},
        therapies: [
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" },
          { clinicalInfo: {}, therapyType: "" }
        ]
      }
    ]
  } as Donor;
});

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
    ...(MONGO_USER && MONGO_PASS
      ? {
          // user: MONGO_USER,
          // pass: MONGO_PASS
        }
      : {})
  });
  console.log(`connected to mongo at ${MONGO_URL}`);
  console.time("WRITE");
  const writeResult = await donorModel.insertMany(donors);
  console.timeEnd("WRITE");
  console.log(`finished writing ${donors.length} donors`);
})().then(() => {
  mongoose.disconnect();
});
