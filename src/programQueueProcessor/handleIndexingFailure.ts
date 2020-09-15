import { Client } from "@elastic/elasticsearch";
import { ResolvedIndex } from "rollCall/types";
import logger from "logger";

export default async ({
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
