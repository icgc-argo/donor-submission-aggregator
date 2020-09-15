import { EachMessagePayload } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient, ResolvedIndex } from "rollCall/types";
import indexClinicalProgram from "indexProgram";
import { initIndexMapping } from "elasticsearch";
import withRetry from "promise-retry";
import handleIndexingFailure from "programQueueProcessor/handleIndexingFailure";
import logger from "logger";
import { ProgramQueueEvent, KnownEventSource } from "./types";

const parseProgramQueueEvent = (message: string): ProgramQueueEvent =>
  JSON.parse(message);

export default (configs: {
  rollCallClient: RollCallClient;
  esClient: Client;
  programQueueTopic: string;
  statusReporter?: StatusReporter;
}) => {
  const {
    rollCallClient,
    esClient,
    programQueueTopic,
    statusReporter,
  } = configs;

  return async ({ message }: EachMessagePayload) => {
    if (message && message.value) {
      const queuedEvent = parseProgramQueueEvent(message.value.toString());
      const { programId } = queuedEvent;
      const retryConfig = {
        factor: 2,
        retries: 100,
        minTimeout: 1000,
        maxTimeout: Infinity,
      };
      let newResolvedIndex: ResolvedIndex | null = null;
      await withRetry(async (retry, attemptIndex) => {
        newResolvedIndex = await rollCallClient.createNewResolvableIndex(
          programId.toLowerCase()
        );
        logger.info(`obtained new index name: ${newResolvedIndex.indexName}`);
        try {
          await initIndexMapping(newResolvedIndex.indexName, esClient);
          for (const change of queuedEvent.changes) {
            if (change.source === KnownEventSource.CLINICAL) {
              await indexClinicalProgram(
                programId,
                newResolvedIndex.indexName,
                esClient
              );
            } else if (change.source === KnownEventSource.RDPC) {
              logger.info(
                `RDPC event received for analysis ${change.analysisId}`
              );
            }
          }

          await rollCallClient.release(newResolvedIndex);
        } catch (err) {
          logger.warn(
            `failed to index program ${programId} on attempt #${attemptIndex}: ${err}`
          );
          await handleIndexingFailure({
            esClient: esClient,
            rollCallIndex: newResolvedIndex,
          });
          retry(err);
        }
      }, retryConfig).catch((err) => {
        logger.error(
          `FAILED TO INDEX PROGRAM ${programId} after ${retryConfig.retries} attempts: ${err}`
        );
        throw err;
      });
      statusReporter?.endProcessingProgram(programId);
    } else {
      throw new Error(`missing message from topic ${programQueueTopic}`);
    }
  };
};
