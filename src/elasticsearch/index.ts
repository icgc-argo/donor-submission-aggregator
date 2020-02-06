import { ES_HOST } from "config";
import flatMap from "lodash/flatMap";
import esMapping from "./donorIndexMapping.json";
import { Client } from "@elastic/elasticsearch";

const globalEsClient = new Client({
  node: ES_HOST
});

export const initIndexMappping = async (
  index: string,
  esClient: Client = globalEsClient
) => {
  const serializedIndexName = index.toLowerCase();
  await esClient.indices.putMapping({
    index: serializedIndexName,
    body: esMapping.mappings
  });
};

export const toEsBulkIndexActions = (indexName: string) => <T>(
  docs: Array<T>
) => flatMap(docs, doc => [{ index: { _index: indexName } }, doc]);

export const esClient = globalEsClient;
