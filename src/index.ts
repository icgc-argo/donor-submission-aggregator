import indexProgram from "indexProgram";
import createRollcallClient from "rollCall";

import { createEsClient, initIndexMapping } from "elasticsearch";
import connectMongo from "clinicalMongo";
import { Kafka } from "kafkajs";
import * as swaggerUi from "swagger-ui-express";
import path from "path";
import yaml from "yamljs";
import express from "express";
import withRetry from "promise-retry";

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

(async () => {
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

  await connectMongo();
  const esClient = await createEsClient();

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

  expressApp.listen(7000, () => {
    logger.info(`Start readiness check at :${PORT}/status`);
  });

  /**
   * The main Kafka subscription
   */
  if (ENABLED) {
    await consumer.subscribe({
      topic: CLINICAL_PROGRAM_UPDATE_TOPIC
    });
    await consumer.run({
      partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
      eachMessage: async ({ message }) => {
        const { programId } = toProgramUpdateEvent(message.value.toString());
        statusReporter.startProcessingProgram(programId);
        const retryConfig = {
          factor: 2,
          retries: 10,
          minTimeout: 1000,
          maxTimeout: Infinity
        };
        await withRetry(async (retry, attemptIndex) => {
          const newResolvedIndex = await rollCallClient.createNewResolvableIndex(
            programId.toLowerCase()
          );
          logger.info(`obtained new index name: ${newResolvedIndex.indexName}`);
          try {
            await initIndexMapping(newResolvedIndex.indexName, esClient);
            await indexProgram(programId, newResolvedIndex.indexName, esClient);
            await rollCallClient.release(newResolvedIndex);
          } catch (err) {
            await esClient.indices
              .delete({
                index: newResolvedIndex.indexName
              })
              .catch(err => {
                logger.warn(
                  `could not delete index ${newResolvedIndex.indexName}: ${err}`
                );
              });
            logger.warn(
              `failed to index program ${programId} on attempt #${attemptIndex}: ${err}`
            );
            logger.warn(`index ${newResolvedIndex.indexName} was removed`);
            retry(err);
          }
        }, retryConfig).catch(err => {
          logger.error(
            `FAILED TO INDEX PROGRAM ${programId} after ${retryConfig.retries} attempts: ${err}`
          );
        });
        statusReporter.endProcessingProgram(programId);
      }
    });
  }
  statusReporter.setReady(true);
})();
