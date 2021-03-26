import { EachMessagePayload } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient, ResolvedIndex } from "rollCall/types";
import indexClinicalData from "indexClinicalData";
import {
  getIndexSettings,
  getLatestIndexName,
  initIndexMapping,
  setIndexWritable,
} from "elasticsearch";
import withRetry from "promise-retry";
import logger from "logger";
import { KnownEventType, ProgramQueueProcessor, QueueRecord } from "./types";
import { indexRdpcData } from "rdpc/index";
import donorIndexMapping from "elasticsearch/donorIndexMapping.json";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import fetchDonorIdsByAnalysis from "rdpc/query/fetchDonorIdsByAnalysis";
import { DLQ_TOPIC_NAME, RETRY_CONFIG_RDPC_GATEWAY } from "config";
import { EgoJwtManager } from "auth";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import fetchVariantCallingAnalyses from "rdpc/query/fetchVariantCallingAnalyses";

const handleIndexingFailure = async ({
  esClient,
  targetIndexName,
}: {
  esClient: Client;
  targetIndexName: string;
}) => {
  // If there was any issues building the index data, writing to the index, or saving the index
  //   then we should delete the index instead of leaving the incomplete index in ES
  await esClient.indices
    .delete({
      index: targetIndexName,
    })
    .catch((err) => {
      logger.error(`Error deleting index ${targetIndexName}: ${err}`);
    });
  logger.info(`Index was removed: ${targetIndexName}`);
};

const newIndexAndInitializeMapping = async (
  rollCallClient: RollCallClient,
  esClient: Client,
  programId: string,
  cloneFromReleasedIndex: boolean
): Promise<ResolvedIndex> => {
  const newResolvedIndex = await rollCallClient.createNewResolvableIndex(
    programId.toLowerCase(),
    cloneFromReleasedIndex
  );
  logger.info(`Obtained new index name: ${newResolvedIndex.indexName}`);
  await initIndexMapping(newResolvedIndex.indexName, esClient);
  return newResolvedIndex;
};

const getNewResolvedIndex = async (
  programId: string,
  esClient: Client,
  rollCallClient: RollCallClient
): Promise<ResolvedIndex> => {
  let newResolvedIndex: ResolvedIndex | null = null;

  let existingIndexName: string | undefined;
  try {
    existingIndexName = await getLatestIndexName(esClient, programId);
  } catch (err) {
    logger.error(
      `error while trying to get existing index for program ${programId} ${JSON.stringify(
        err
      )}`,
      err
    );
    if (err.meta?.body?.status == 404) {
      logger.info(`no existing index for program ${programId}`);
    } else {
      throw err;
    }
  }
  if (existingIndexName) {
    const response = await getIndexSettings(esClient, existingIndexName);
    const indexSettings = response.body[existingIndexName].settings.index;
    const currentNumOfShards = parseInt(indexSettings.number_of_shards);
    const currentNumOfReplicas = parseInt(indexSettings.number_of_replicas);

    // check if existing latest index settings match default settings
    if (
      currentNumOfReplicas ===
        donorIndexMapping.settings["index.number_of_replicas"] &&
      currentNumOfShards ===
        donorIndexMapping.settings["index.number_of_shards"]
    ) {
      logger.info(
        "Existing index settings match default settings, obtaining a new index name from rollcall, clone=true."
      );
      newResolvedIndex = await newIndexAndInitializeMapping(
        rollCallClient,
        esClient,
        programId,
        true
      );
    } else {
      // because existing index settings do not match default, migrate this index
      logger.info(
        "Existing index settings do not match default settings, obtaining a new index name from rollcall, clone=false."
      );
      newResolvedIndex = await newIndexAndInitializeMapping(
        rollCallClient,
        esClient,
        programId,
        false
      );

      logger.info(
        `Begin reindexing all documents from ${existingIndexName} to ${newResolvedIndex.indexName}`
      );
      await esClient.reindex({
        body: {
          source: {
            index: existingIndexName,
          },
          dest: {
            index: newResolvedIndex.indexName,
          },
        },
        refresh: true,
      });
      logger.info(
        `Reindexed all documents from ${existingIndexName} to ${newResolvedIndex.indexName}`
      );
    }
  } else {
    // if no index exists for program, get a new index name
    logger.info("Obtaining a new index name from rollcall, clone=false.");
    newResolvedIndex = await newIndexAndInitializeMapping(
      rollCallClient,
      esClient,
      programId,
      false
    );
  }
  return newResolvedIndex;
};

const createEventProcessor = async ({
  rollCallClient,
  esClient,
  egoJwtManager,
  analysisFetcher = fetchAnalyses,
  analysisWithSpecimensFetcher = fetchAnalysesWithSpecimens,
  fetchVC = fetchVariantCallingAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
  statusReporter,
  sendDlqMessage,
}: {
  rollCallClient: RollCallClient;
  esClient: Client;
  sendDlqMessage: ProgramQueueProcessor["sendDlqMessage"];
  egoJwtManager: EgoJwtManager;
  analysisFetcher?: typeof fetchAnalyses;
  analysisWithSpecimensFetcher?: typeof fetchAnalysesWithSpecimens;
  fetchVC?: typeof fetchVariantCallingAnalyses;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
  statusReporter?: StatusReporter;
}) => {
  return async ({ message, topic }: EachMessagePayload) => {
    if (!message?.value) {
      // Require a message with a value
      throw new Error(`Missing message from topic ${topic}`);
    }
    const queuedEvent = JSON.parse(message.value.toString());
    const { programId } = queuedEvent;

    logger.info(`Begin processing event: ${queuedEvent.type} - ${programId}`);

    try {
      await withRetry(async (retry, attemptIndex) => {
        const newResolvedIndex = await getNewResolvedIndex(
          programId,
          esClient,
          rollCallClient
        );
        const targetIndexName = newResolvedIndex.indexName;

        try {
          await setIndexWritable(esClient, targetIndexName, true);
          logger.info(`Enabled index writing for: ${targetIndexName}`);

          if (queuedEvent.type === KnownEventType.CLINICAL) {
            await indexClinicalData(
              queuedEvent.programId,
              targetIndexName,
              esClient
            );
          } else if (queuedEvent.type === KnownEventType.RDPC) {
            for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
              await indexRdpcData({
                programId,
                rdpcUrl,
                targetIndexName,
                esClient,
                egoJwtManager: egoJwtManager,
                analysesFetcher: analysisFetcher,
                analysesWithSpecimensFetcher: analysisWithSpecimensFetcher,
                fetchVC,
                fetchDonorIds,
                analysisId: queuedEvent.analysisId,
              });
            }
          } else {
            // SYNC
            await indexClinicalData(
              queuedEvent.programId,
              targetIndexName,
              esClient
            );
            for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
              await indexRdpcData({
                programId,
                rdpcUrl,
                targetIndexName: targetIndexName,
                esClient,
                egoJwtManager,
                analysesFetcher: analysisFetcher,
                analysesWithSpecimensFetcher: analysisWithSpecimensFetcher,
                fetchVC,
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
            esClient,
            targetIndexName,
          });
          retry(err);
        }

        await setIndexWritable(esClient, targetIndexName, true);
        logger.info(`Disabled index writing for: ${targetIndexName}`); // TODO: write test to ensure the produced index has writing disabled.
      }, RETRY_CONFIG_RDPC_GATEWAY);
    } catch (err) {
      logger.error(
        `FAILED TO INDEX PROGRAM ${programId} after ${
          RETRY_CONFIG_RDPC_GATEWAY.retries
        } attempts: ${JSON.stringify(err)}`,
        err
      );
      await sendDlqMessage(DLQ_TOPIC_NAME, message.value.toString());
    }

    statusReporter?.endProcessingProgram(programId);
  };
};
export default createEventProcessor;
