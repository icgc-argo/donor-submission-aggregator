import { EachMessagePayload } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient, ResolvedIndex } from "rollCall/types";
import indexClinicalData from "indexClinicalData";
import { initIndexMapping } from "elasticsearch";
import withRetry from "promise-retry";
import logger from "logger";
import { KnownEventType, QueueRecord } from "./types";
import { indexRdpcData } from "rdpc/index";
import fetchAnalyses from "rdpc/fetchAnalyses";
import fetchDonorIdsByAnalysis from "rdpc/fetchDonorIdsByAnalysis";

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

export default ({
  rollCallClient,
  esClient,
  programQueueTopic,
  analysisFetcher = fetchAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
  statusReporter,
}: {
  rollCallClient: RollCallClient;
  esClient: Client;
  programQueueTopic: string;
  analysisFetcher?: typeof fetchAnalyses;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
  statusReporter?: StatusReporter;
}) => {
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
          programId.toLowerCase(),
          true
        );
        logger.info(`obtained new index name: ${newResolvedIndex.indexName}`);
        try {
          await initIndexMapping(newResolvedIndex.indexName, esClient);

          await esClient.indices.putSettings({
            index: newResolvedIndex.indexName.toLowerCase(),
            body: {
              settings: {
                "index.blocks.write": "false",
              },
            },
          });

          logger.info(`Enabled WRITE to index : ${newResolvedIndex.indexName}`);

          if (queuedEvent.type === KnownEventType.CLINICAL) {
            await indexClinicalData(
              queuedEvent.programId,
              newResolvedIndex.indexName,
              esClient
            );
          } else if (queuedEvent.type === KnownEventType.RDPC) {
            for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
              await indexRdpcData({
                programId,
                rdpcUrl,
                targetIndexName: newResolvedIndex.indexName,
                esClient,
                analysesFetcher: analysisFetcher,
                fetchDonorIds,
                analysisId: queuedEvent.analysisId,
              });
            }
          } else {
            await indexClinicalData(
              queuedEvent.programId,
              newResolvedIndex.indexName,
              esClient
            );
            for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
              await indexRdpcData({
                programId,
                rdpcUrl,
                targetIndexName: newResolvedIndex.indexName,
                esClient,
                analysesFetcher: analysisFetcher,
                fetchDonorIds,
              });
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
