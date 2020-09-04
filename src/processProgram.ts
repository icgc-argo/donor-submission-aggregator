import indexProgram, { handleIndexingFailure } from "indexProgram";

import { initIndexMapping } from "elasticsearch";
import withRetry from "promise-retry";

import logger from "logger";
import { RollcallClient } from "rollCall/types";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";

const processProgram = async ({
  programId,
  statusReporter,
  rollCallClient,
  esClient,
}: {
  programId: string;
  statusReporter: StatusReporter;
  rollCallClient: RollcallClient;
  esClient: Client;
}) => {
  statusReporter.startProcessingProgram(programId);
  const retryConfig = {
    factor: 2,
    retries: 100,
    minTimeout: 1000,
    maxTimeout: Infinity,
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
      logger.warn(
        `failed to index program ${programId} on attempt #${attemptIndex}: ${err}`
      );
      handleIndexingFailure({
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
  statusReporter.endProcessingProgram(programId);
};

export default processProgram;
