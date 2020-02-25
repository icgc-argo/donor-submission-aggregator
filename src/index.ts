import indexProgram from "indexProgram";
import rollCall from "rollCall";
import { initIndexMappping } from "elasticsearch";
import dotenv from "dotenv";
import connectMongo from "connectMongo";
import { Kafka } from "kafkajs";
import * as swaggerUi from "swagger-ui-express";
import path from "path";
import yaml from "yamljs";

import toProgramUpdateEvent from "toProgramUpdateEvent";
import {
  CLINICAL_PROGRAM_UPDATE_TOPIC,
  KAFKA_CONSUMER_GROUP,
  KAFKA_BROKERS,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  PORT
} from "config";
import statusReport from "./statusReport";
import logger from "logger";

dotenv.config();

const statusReporter = statusReport();
statusReporter.app.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(yaml.load(path.join(__dirname, "./assets/swagger.yaml")))
);
statusReporter.app.listen(7000, () => {
  logger.info(`Start readiness check at :${PORT}/status`);
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
        const { programId } = toProgramUpdateEvent(message.value.toString());
        const newIndexName = await rollCall.getNewIndexName(
          programId.toLowerCase()
        );
        await initIndexMappping(newIndexName);
        statusReporter.startProcessingProgram(programId);
        await indexProgram(programId, newIndexName);
        statusReporter.endProcessingProgram(programId);
        await rollCall.release(newIndexName);
      } catch (err) {
        logger.error(err);
      }
    }
  });
  statusReporter.setReady(true);
})();
