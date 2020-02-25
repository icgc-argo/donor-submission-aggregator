import indexProgram from "indexProgram";
import rollCall from "rollCall";
import { initIndexMappping } from "elasticsearch";
import dotenv from "dotenv";
import connectMongo from "connectMongo";
import { Kafka } from "kafkajs";
import * as swaggerUi from "swagger-ui-express";
import path from "path";
import yaml from "yamljs";
import express from "express";

import toProgramUpdateEvent from "toProgramUpdateEvent";
import {
  CLINICAL_PROGRAM_UPDATE_TOPIC,
  KAFKA_CONSUMER_GROUP,
  KAFKA_BROKERS,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  PORT
} from "config";
import applyStatusRepor from "./statusReport";
import logger from "logger";

dotenv.config();

/**
 * Express app to host status reports and other interface for interacting with this app
 */
const expressApp = express();
const statusReporter = applyStatusRepor(expressApp)("/status");
expressApp.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(yaml.load(path.join(__dirname, "./assets/swagger.yaml")))
);
expressApp.listen(7000, () => {
  logger.info(`Start readiness check at :${PORT}/status`);
});

/**
 * The main Kafka subscription
 */
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
