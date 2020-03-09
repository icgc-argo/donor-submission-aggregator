import indexProgram from "indexProgram";
import createRollcallClient from "rollCall";

import { initIndexMapping } from "elasticsearch";
import connectMongo from "clinicalMongo";
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
  PORT,
  ENABLED,
  ROLLCALL_SERVICE_ROOT,
  ROLLCALL_INDEX_ENTITY,
  ROLLCALL_INDEX_SHARDPREFIX,
  ROLLCALL_INDEX_TYPE
} from "config";
import applyStatusRepor from "./statusReport";
import logger from "logger";

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
if (ENABLED) {
  (async () => {
    await connectMongo();

    const rollCallClient = createRollcallClient({
      url: ROLLCALL_SERVICE_ROOT,
      entity: ROLLCALL_INDEX_ENTITY,
      type: ROLLCALL_INDEX_TYPE,
      shardPrefix: ROLLCALL_INDEX_SHARDPREFIX
    });

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
          const newResolvedIndex = await rollCallClient.createNewResolvableIndex(
            programId.toLowerCase()
          );
          await initIndexMapping(newResolvedIndex.indexName);
          statusReporter.startProcessingProgram(programId);
          await indexProgram(programId, newResolvedIndex.indexName);
          statusReporter.endProcessingProgram(programId);
          await rollCallClient.release(newResolvedIndex);
        } catch (err) {
          logger.error(err);
        }
      }
    });
    statusReporter.setReady(true);
  })();
}
