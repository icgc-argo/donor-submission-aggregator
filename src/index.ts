import createRollCallClient from "rollCall";

import { createEsClient } from "elasticsearch";
import connectMongo from "clinicalMongo";
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
} from "config";
import applyStatusReport from "./statusReport";
import logger from "logger";
import createProgramQueueProcessor from "programQueueProcessor";

(async () => {
  /**
   * Express app to host status reports and other interface for interacting with this app
   */
  const expressApp = express();
  const statusReporter = applyStatusReport(expressApp)("/status");
  expressApp.use(
    "/",
    swaggerUi.serve,
    swaggerUi.setup(yaml.load(path.join(__dirname, "./assets/swagger.yaml")))
  );

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

  expressApp.listen(7000, () => {
    logger.info(`Start readiness check at :${PORT}/status`);
  });

  /**
   * The main Kafka subscription to source events
   */
  await consumer.subscribe({
    topic: CLINICAL_PROGRAM_UPDATE_TOPIC,
  });
  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: async ({ topic, message }) => {
      if (topic === CLINICAL_PROGRAM_UPDATE_TOPIC) {
        programQueueProcessor.queueSourceEvent({
          message: message,
          eventSources: [programQueueProcessor.dataSourceMap[topic]],
        });
      }
    },
  });
  statusReporter.setReady(true);
})();
