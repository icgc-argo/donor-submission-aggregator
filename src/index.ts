import indexProgram from "indexProgram";
import rollCall from "rollCall";
import { initIndexMappping } from "elasticsearch";
import dotenv from "dotenv";
import connectMongo from "connectMongo";
import { Kafka } from "kafkajs";
import toProgramUpdateEvent from "toProgramUpdateEvent";
import {
  CLINICAL_PROGRAM_UPDATE_TOPIC,
  KAFKA_CONSUMER_GROUP,
  KAFKA_BROKERS,
  PARTITIONS_CONSUMED_CONCURRENTLY
} from "config";

dotenv.config();

(async () => {
  await connectMongo();
  const kafka = new Kafka({
    clientId: `donor-submission-aggregator-${Math.random()}`,
    brokers: KAFKA_BROKERS
  });
  const consumer = kafka.consumer({
    groupId: KAFKA_CONSUMER_GROUP
  });
  await consumer.connect();
  console.log("Connected Kafka consumer");
  await consumer.subscribe({ topic: CLINICAL_PROGRAM_UPDATE_TOPIC });
  console.log(`Subscribed to topic: ${CLINICAL_PROGRAM_UPDATE_TOPIC}`);
  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: async ({ message }) => {
      try {
        const messageContent = toProgramUpdateEvent(message.value.toString());
        const indexTimer = `indexProgram ${messageContent.programId}`;
        const newIndexName = await rollCall.getNewIndexName(
          messageContent.programId.toLowerCase()
        );
        console.log("newIndexName: ", newIndexName);
        await initIndexMappping(newIndexName);
        console.time(indexTimer);
        await indexProgram(messageContent.programId, newIndexName);
        console.timeEnd(indexTimer);
        await rollCall.release(newIndexName);
      } catch (err) {
        console.error(err);
      }
    }
  });
  console.log("Started processing");
})();
