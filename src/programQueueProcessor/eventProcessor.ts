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
import { KnownEventType, ProgramQueueProcessor } from "./types";
import { indexRdpcData } from "rdpc/index";
import donorIndexMapping from "elasticsearch/donorIndexMapping.json";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import fetchDonorIdsByAnalysis from "rdpc/query/fetchDonorIdsByAnalysis";
import {
  FEATURE_INDEX_FILE_ENABLED,
  kafkaConfig,
  RETRY_CONFIG_RDPC_GATEWAY,
} from "config";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import fetchVariantCallingAnalyses from "rdpc/query/fetchVariantCallingAnalyses";
import { indexFileData } from "files";
import { getFilesByProgramId } from "files/getFilesByProgramId";
import { Program } from "external/kafka/consumers/eventParsers/parseFilePublicReleaseEvent";

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

/**
 *
 * @param programId
 * @param esClient
 * @param rollCallClient
 * @param cloneExisting Indicator that the existing index can be used as a starting point for the new index. If false, a new index will be created without cloning the existing index.
 * @returns New index from roll call, with existing documents if cloneExisting is true
 */
const getNewResolvedIndex = async (
  programId: string,
  esClient: Client,
  rollCallClient: RollCallClient,
  cloneExisting: boolean
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
    const indexSettingsMatch =
      currentNumOfReplicas ===
        donorIndexMapping.settings["index.number_of_replicas"] &&
      currentNumOfShards ===
        donorIndexMapping.settings["index.number_of_shards"];

    const doClone = cloneExisting && indexSettingsMatch;

    logger.info(`Obtaining new index, clone = ${doClone}`);
    newResolvedIndex = await newIndexAndInitializeMapping(
      rollCallClient,
      esClient,
      programId,
      doClone
    );

    if (cloneExisting && !indexSettingsMatch) {
      // We want an index with all existing documents but could not clone due to settings mismatch,
      //   so let's copy over all the existing documents into our new index!
      logger.info(
        `Existing index could not be cloned due to incorrect existing settings: ${JSON.stringify(
          {
            number_of_replicas:
              donorIndexMapping.settings["index.number_of_replicas"],
            number_of_shards:
              donorIndexMapping.settings["index.number_of_shards"],
          }
        )}`
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
    logger.info("Obtaining new index, first for program.");
    newResolvedIndex = await newIndexAndInitializeMapping(
      rollCallClient,
      esClient,
      programId,
      false
    );
  }
  return newResolvedIndex;
};

const createEventProcessor = ({
  rollCallClient,
  esClient,
  analysesFetcher = fetchAnalyses,
  analysesWithSpecimensFetcher = fetchAnalysesWithSpecimens,
  fetchVC = fetchVariantCallingAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
  fileData = getFilesByProgramId,
  statusReporter,
  sendDlqMessage,
}: {
  rollCallClient: RollCallClient;
  esClient: Client;
  sendDlqMessage: ProgramQueueProcessor["sendDlqMessage"];
  analysesFetcher?: typeof fetchAnalyses;
  analysesWithSpecimensFetcher?: typeof fetchAnalysesWithSpecimens;
  fetchVC?: typeof fetchVariantCallingAnalyses;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
  fileData?: typeof getFilesByProgramId;
  statusReporter?: StatusReporter;
}) => {
  return async ({ message, topic }: EachMessagePayload) => {
    if (!message?.value) {
      // Require a message with a value
      throw new Error(`Missing message from topic ${topic}`);
    }
    const queuedEvent = JSON.parse(message.value.toString());
    const { programId } = queuedEvent;

    statusReporter?.startProcessingProgram(programId);

    logger.info(`Begin processing event: ${queuedEvent.type} - ${programId}`);

    // For sync events we want to regenerate the entire index, so do not clone.
    // Clone for all other event types (RDPC and CLINICAL)
    const doClone = queuedEvent.type !== KnownEventType.SYNC;

    try {
      // No await on the withRetry():
      //  we need this method to return to the kafka consumer immediately so that this long running process doesn't
      //  disconnect the consumer group from the kafka broker.
      withRetry(async (retry, attemptIndex) => {
        const newResolvedIndex = await getNewResolvedIndex(
          programId,
          esClient,
          rollCallClient,
          doClone
        );
        const targetIndexName = newResolvedIndex.indexName;

        try {
          await setIndexWritable(esClient, targetIndexName, true);
          logger.info(`Enabled index writing for: ${targetIndexName}`);
          switch (queuedEvent.type) {
            case KnownEventType.CLINICAL:
              // Re-index all of clinical for this program.
              // Ideally, this would only update only the affected donors - an update to clinical is required to communicate this information in the kafka event.
              await indexClinicalData(programId, targetIndexName, esClient);
              break;

            case KnownEventType.FILE_RELEASE:
              if (FEATURE_INDEX_FILE_ENABLED) {
                const programs: Program[] = queuedEvent.programs;
                for (const program of programs) {
                  await indexFileData(
                    programId,
                    fileData,
                    targetIndexName,
                    esClient,
                    program.donorsUpdated
                  );
                }
              }
              break;

            case KnownEventType.RDPC:
              // Update RDPC data. Analysis ID is expected in the event so only documents affected by that analysis will be updated.
              for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
                await indexRdpcData({
                  programId,
                  rdpcUrl,
                  targetIndexName,
                  esClient,
                  analysesFetcher,
                  analysesWithSpecimensFetcher,
                  fetchVC,
                  fetchDonorIds,
                  analysisId: queuedEvent.analysisId,
                });
              }
              break;
            case KnownEventType.SYNC:
              // Generate Clinical and RPDC data for all analyses. We expect an empty index here (doClone = false)
              // so all donor data for this program needs to be gathered and added before release.
              await indexClinicalData(programId, targetIndexName, esClient);
              for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
                await indexRdpcData({
                  programId,
                  rdpcUrl,
                  targetIndexName: targetIndexName,
                  esClient,
                  analysesFetcher,
                  analysesWithSpecimensFetcher,
                  fetchVC,
                  fetchDonorIds,
                });
              }

              if (FEATURE_INDEX_FILE_ENABLED) {
                await indexFileData(
                  programId,
                  fileData,
                  targetIndexName,
                  esClient
                );
              }
              break;
          }
          logger.info(`Releasing index: ${targetIndexName}`);
          await rollCallClient.release(newResolvedIndex);
        } catch (err) {
          logger.warn(
            `Failed to index program ${programId} on attempt #${attemptIndex}: ${err}`
          );
          await handleIndexingFailure({
            esClient,
            targetIndexName,
          });
          retry(err);
        }

        await setIndexWritable(esClient, targetIndexName, false);
        logger.info(`Disabled index writing for: ${targetIndexName}`);
        statusReporter?.endProcessingProgram(programId);
      }, RETRY_CONFIG_RDPC_GATEWAY);
    } catch (err) {
      statusReporter?.endProcessingProgram(programId);
      logger.error(
        `Failed to index program ${programId} after ${
          RETRY_CONFIG_RDPC_GATEWAY.retries
        } attempts: ${JSON.stringify(err)}`,
        err
      );
      // Message processing failed, make sure it is sent to the Dead Letter Queue.
      if (kafkaConfig.consumers.programQueue.dlq) {
        sendDlqMessage(
          kafkaConfig.consumers.programQueue.dlq,
          message.value.toString()
        );
      }
    }
  };
};
export default createEventProcessor;
