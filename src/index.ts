import indexProgram from "indexProgram";
import rollCall from "rollCall";
import { initIndexMappping } from "elasticsearch";
import dotenv from "dotenv";
import connectMongo from "connectMongo";
import mongoose from "mongoose";
import { Kafka } from "kafkajs";
import toProgramUpdateEvent from "toProgramUpdateEvent";

dotenv.config();

// (async () => {
//   await connectMongo();
//   const programShortName = "DASH-CA";
//   const newIndexName = await rollCall.getNewIndexName(
//     programShortName.toLowerCase()
//   );
//   await initIndexMappping(newIndexName);
//   await indexProgram(programShortName, newIndexName);
//   await rollCall.release(newIndexName);
//   await mongoose.disconnect();
// })();

const PROGRAM_UPDATE_TOPIC = "PROGRAM_UPDATE";

(async () => {
  await connectMongo();
  const kafka = new Kafka({
    clientId: "donor-submission-aggregator",
    brokers: ["localhost:9092"]
  });
  const consumer = kafka.consumer({
    groupId: "donor-submission-aggregator"
  });
  await consumer.connect();
  console.log("Connected Kafka consumer");
  await consumer.subscribe({ topic: PROGRAM_UPDATE_TOPIC });
  console.log(`Subscribed to topic: ${PROGRAM_UPDATE_TOPIC}`);
  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const messageContent = toProgramUpdateEvent(message.value.toString());
        const newIndexName = await rollCall.getNewIndexName(
          messageContent.programId.toLowerCase()
        );
        console.log("newIndexName: ", newIndexName);
        await initIndexMappping(newIndexName);
        await indexProgram(messageContent.programId, newIndexName);
        await rollCall.release(newIndexName);
      } catch (err) {
        console.error(err);
      }
    }
  });
  console.log("started processing");
})();
