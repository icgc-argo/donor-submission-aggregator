import { EachMessagePayload } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient, ResolvedIndex } from "rollCall/types";
import indexClinicalData from "indexClinicalData";
import { initIndexMapping } from "elasticsearch";
import withRetry from "promise-retry";
import logger from "logger";
import { KnownEventType, QueueRecord } from "./types";

// todo
const indexRdpcData = (programId: string, rdpcUrl: string) => {
  console.log(
    `processing program ${programId} from ${rdpcUrl}, to be implemented`
  );
};

const parseProgramQueueEvent = (message: string): QueueRecord =>
  JSON.parse(message);

const handleIndexingFailure = async ({
  esClient,
  rollCallIndex,
}: {
  esClient: Client;
  rollCallIndex: ResolvedIndex;
}) => {
  await esClient.indices
    .delete({
      index: rollCallIndex.indexName,
    })
    .catch((err) => {
      logger.warn(`could not delete index ${rollCallIndex.indexName}: ${err}`);
    });
  logger.warn(`index ${rollCallIndex.indexName} was removed`);
};

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
      logger.info(
        `starts processing ${queuedEvent.type} event for program ${programId}`
      );
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
          if (queuedEvent.type === KnownEventType.CLINICAL) {
            await indexClinicalData(
              queuedEvent.programId,
              newResolvedIndex.indexName,
              esClient
            );
          } else if (queuedEvent.type === KnownEventType.RDPC) {
            for (const rdpcUrls in queuedEvent.rdpcGatewayUrls) {
              // todo
              await indexRdpcData(programId, rdpcUrls);
            }
          } else {
            await indexClinicalData(
              queuedEvent.programId,
              newResolvedIndex.indexName,
              esClient
            );
            for (const rdpcUrls in queuedEvent.rdpcGatewayUrls) {
              await indexRdpcData(programId, rdpcUrls);
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
