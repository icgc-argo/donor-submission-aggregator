import { Client } from "@elastic/elasticsearch";
import {
  featureFlags,
  RETRY_CONFIG_RDPC_GATEWAY,
  rollcallConfig,
} from "config";
import { getEsClient, setIndexWritable } from "external/elasticsearch";
import { Program } from "external/kafka/consumers/eventParsers/parseFilePublicReleaseEvent";
import createRollcallClient from "external/rollCall";
import { RollCallClient } from "external/rollCall/types";
import { indexFileData } from "files";
import { getFilesByProgramId } from "files/getFilesByProgramId";
import logger from "logger";
import withRetry from "promise-retry";
import { FileReleaseEvent } from "./types";
import { getNewResolvedIndex, handleIndexingFailure } from "./util";

/**
 * Processor for File Release event
 * Will update donor aggregated data based on file manager changes relating to public release
 * One event can include multiple programs, so the main process is repeated for each program in the event
 * @param event
 * @param sendDlqMessage
 * @param services optional overwrite of the default services, useful for setting mocks in testing
 */
async function processFileReleaseEvent(
  event: FileReleaseEvent,
  sendDlqMessage: (messageJSON: string) => Promise<void>,
  services: {
    esClient?: Client;
    rollcallClient?: RollCallClient;
    fileData?: typeof getFilesByProgramId;
  } = {}
) {
  const esClient = services.esClient || (await getEsClient());
  const rollcallClient =
    services.rollcallClient || (await createRollcallClient(rollcallConfig));
  const fileData = getFilesByProgramId;

  const doClone = true;

  try {
    if (featureFlags.index.files) {
      const programs: Program[] = event.programs;
      for (const program of programs) {
        withRetry(async (retry, attemptIndex) => {
          const programId = program.id;
          const newResolvedIndex = await getNewResolvedIndex(
            programId,
            esClient,
            rollcallClient,
            doClone
          );
          const targetIndexName = newResolvedIndex.indexName;
          try {
            await setIndexWritable(esClient, targetIndexName, true);
            logger.info(`Enabled index writing for: ${targetIndexName}`);

            await indexFileData(
              programId,
              fileData,
              targetIndexName,
              esClient,
              program.donorsUpdated
            );

            logger.info(`Releasing index: ${targetIndexName}`);
            await rollcallClient.release(newResolvedIndex);

            await setIndexWritable(esClient, targetIndexName, false);
            logger.info(`Disabled index writing for: ${targetIndexName}`);
          } catch (indexingErr) {
            logger.warn(
              `Failed to index program ${programId} on attempt #${attemptIndex}: ${indexingErr}`
            );
            await handleIndexingFailure({
              esClient,
              targetIndexName,
            });
            retry(indexingErr);
          }
        }, RETRY_CONFIG_RDPC_GATEWAY);
      }
    }
  } catch (retryErr) {
    logger.error(
      `Failed to index update indices for file release after ${
        RETRY_CONFIG_RDPC_GATEWAY.retries
      } attempts: ${JSON.stringify(retryErr)}`,
      retryErr
    );

    // Message processing failed, make sure it is sent to the Dead Letter Queue.
    sendDlqMessage(JSON.stringify(event));
  }
}

export default processFileReleaseEvent;
