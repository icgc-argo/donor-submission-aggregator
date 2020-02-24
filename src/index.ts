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
import statusReport from "./statusReport";
import logger from "logger";

dotenv.config();

const statusReporter = statusReport();
statusReporter.app.listen(7000, () => {
  logger.info(`Start readiness check at :${7000}/status`);
});

(async () => {
  await connectMongo();

  const kafka = new Kafka({
    clientId: `donor-submission-aggregator`,
    brokers: KAFKA_BROKERS
  });
  const consumer = kafka.consumer({
    groupId: KAFKA_CONSUMER_GROUP
  });
  await consumer.connect();
  await consumer.subscribe({ topic: CLINICAL_PROGRAM_UPDATE_TOPIC });
  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: async ({ message }) => {
      try {
        const messageContent = toProgramUpdateEvent(message.value.toString());
        const newIndexName = await rollCall.getNewIndexName(
          messageContent.programId.toLowerCase()
        );
        await initIndexMappping(newIndexName);
        statusReporter.startProcessingProgram(messageContent.programId);
        await indexProgram(messageContent.programId, newIndexName);
        statusReporter.endProcessingProgram(messageContent.programId);
        await rollCall.release(newIndexName);
      } catch (err) {
        console.error(err);
      }
    }
  });
  statusReporter.setReady(true);
})();
