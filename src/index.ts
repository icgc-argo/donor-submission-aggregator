import createRollCallClient from "rollCall";

import { createEsClient } from "elasticsearch";
import connectMongo from "indexClinicalData/clinicalMongo";
import { Kafka } from "kafkajs";
import * as swaggerUi from "swagger-ui-express";
import path from "path";
import yaml from "yamljs";
import express from "express";
import {
  CLINICAL_PROGRAM_UPDATE_TOPIC,
  KAFKA_CONSUMER_GROUP,
  KAFKA_BROKERS,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  PORT,
  ROLLCALL_SERVICE_ROOT,
  ROLLCALL_INDEX_ENTITY,
  ROLLCALL_INDEX_SHARDPREFIX,
  ROLLCALL_INDEX_TYPE,
  ROLLCALL_ALIAS_NAME,
  RDPC_PROGRAM_UPDATE_TOPIC,
  RDPC_URL,
  FEATURE_RDPC_INDEXING_ENABLED,
} from "config";
import applyStatusReport from "./statusReport";
import logger from "logger";
import createProgramQueueProcessor from "programQueueProcessor";
import parseClinicalProgramUpdateEvent from "eventParsers/parseClinicalProgramUpdateEvent";
import parseRdpcProgramUpdateEvent from "eventParsers/parseRdpcProgramUpdateEvent";

(async () => {
  /**
   * Express app to host status reports and other interface for interacting with this app
   */
  const expressApp = express();
  const statusReporter = applyStatusReport(expressApp)("/status");
  expressApp.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(yaml.load(path.join(__dirname, "./assets/swagger.yaml")))
  );

  expressApp.post("/index/program/:program_id", async (req, res) => {
    const programId = req.params.program_id;
    try {
      logger.info(
        `received request to index program ${programId}, validating program id...`
      );
      // validate programId:
      const regex = new RegExp(
        "^[A-Z0-9][-_A-Z0-9]{2,7}[-](([A-Z][A-Z])|(\bINTL\b))$"
      );
      const found = programId.match(regex);

      if (!found) {
        return res
          .status(400)
          .send("programId is invalid, please enter a valid programId.");
      } else {
        await programQueueProcessor.enqueueEvent({
          programId: programId,
          type: programQueueProcessor.knownEventTypes.SYNC,
          rdpcGatewayUrls: [RDPC_URL],
        });
        return res.status(200).send(`program ${programId} has been indexed.`);
      }
    } catch (error) {
      logger.error("error in processing index program request: " + error);
      return res.status(500).send(`failed to index program ${programId}`);
    }
  });

  await connectMongo();
  const esClient = await createEsClient();

  const rollCallClient = createRollCallClient({
    url: ROLLCALL_SERVICE_ROOT,
    aliasName: ROLLCALL_ALIAS_NAME,
    entity: ROLLCALL_INDEX_ENTITY,
    type: ROLLCALL_INDEX_TYPE,
    shardPrefix: ROLLCALL_INDEX_SHARDPREFIX,
  });

  const kafka = new Kafka({
    clientId: `donor-submission-aggregator`,
    brokers: KAFKA_BROKERS,
  });
  const consumer = kafka.consumer({
    groupId: KAFKA_CONSUMER_GROUP,
  });

  const programQueueProcessor = await createProgramQueueProcessor({
    kafka,
    esClient,
    rollCallClient,
    statusReporter,
  });

  /**
   * The main Kafka subscription to source events
   */
  await Promise.all([
    consumer.subscribe({
      topic: CLINICAL_PROGRAM_UPDATE_TOPIC,
    }),
    consumer.subscribe({
      topic: RDPC_PROGRAM_UPDATE_TOPIC,
    }),
  ]);
  logger.info(`subscribed to source events ${CLINICAL_PROGRAM_UPDATE_TOPIC}`);
  logger.info(`subscribed to source events ${RDPC_PROGRAM_UPDATE_TOPIC}`);
  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: async ({ topic, message }) => {
      logger.info(`received event from topic ${topic}`);
      if (message && message.value) {
        switch (topic) {
          case CLINICAL_PROGRAM_UPDATE_TOPIC:
            const { programId } = parseClinicalProgramUpdateEvent(
              message.value.toString()
            );
            await programQueueProcessor.enqueueEvent({
              programId,
              type: programQueueProcessor.knownEventTypes.CLINICAL,
            });
            break;

          case RDPC_PROGRAM_UPDATE_TOPIC:
            if (FEATURE_RDPC_INDEXING_ENABLED) {
              const event = parseRdpcProgramUpdateEvent(
                message.value.toString()
              );
              await programQueueProcessor.enqueueEvent({
                programId: event.studyId,
                type: programQueueProcessor.knownEventTypes.RDPC,
                rdpcGatewayUrls: [RDPC_URL],
                analysisId: event.analysisId,
              });
            }
            break;

          default:
            break;
        }
      } else {
        throw new Error(`missing message from a ${topic} event`);
      }
    },
  });
  logger.info("pipeline is ready!");
  expressApp.listen(PORT, () => {
    logger.info(`Start readiness check at :${PORT}/status`);
  });
  statusReporter.setReady(true);
})();
