import {
  ES_HOST,
  VAULT_ES_SECRET_PATH,
  USE_VAULT,
  ES_CLIENT_TRUST_SSL_CERT,
  rollcallConfig,
} from "config";
import flatMap from "lodash/flatMap";
import esMapping from "./donorIndexMapping.json";
import { ApiResponse, Client } from "@elastic/elasticsearch";
import { loadVaultSecret } from "../vault";
import logger from "logger";
import { generateIndexName } from "../../processors/util";

type EsSecret = {
  user: string;
  pass: string;
};

const isEsSecret = (data: { [k: string]: any }): data is EsSecret => {
  return typeof data["user"] === "string" && typeof data["pass"] === "string";
};

let esClient: Client;

export async function getEsClient() {
  if (esClient) {
    return esClient;
  }
  esClient = await createEsClient();
  return esClient;
}

export const createEsClient = async (): Promise<Client> => {
  let esClient: Client;
  if (USE_VAULT) {
    const secretData = await loadVaultSecret()(VAULT_ES_SECRET_PATH).catch(
      (err) => {
        logger.error(
          `could not read Elasticsearch secret at path ${VAULT_ES_SECRET_PATH}`
        );
        throw err;
      }
    );
    if (isEsSecret(secretData)) {
      esClient = new Client({
        node: ES_HOST,
        ssl: {
          rejectUnauthorized: !ES_CLIENT_TRUST_SSL_CERT,
        },
        auth: {
          username: secretData.user,
          password: secretData.pass,
        },
      });
    } else {
      throw new Error(
        `vault secret at ${VAULT_ES_SECRET_PATH} could not be read`
      );
    }
  } else {
    esClient = new Client({
      node: ES_HOST,
    });
  }
  try {
    await esClient.ping();
  } catch (err) {
    logger.error(`esClient failed to connect to cluster`);
    throw err;
  }
  logger.info(`successfully created Elasticsearch client for ${ES_HOST}`);
  return esClient;
};

export const initIndexMapping = async (index: string, esClient: Client) => {
  const serializedIndexName = index.toLowerCase();
  try {
    await esClient.indices.putMapping({
      index: serializedIndexName,
      body: esMapping.mappings,
    });
  } catch (error) {
    logger.error(`initIndexMapping -- ${JSON.stringify(error)}`);
  }
};

export const toEsBulkIndexActions = <T = {}>(
  indexName: string,
  getDocumentId: (document: T) => string | undefined
) => (docs: Array<T>) =>
  flatMap(docs, (doc) => {
    const documentId = getDocumentId(doc);
    return [
      {
        index: documentId
          ? { _index: indexName, _id: documentId }
          : { _index: indexName },
      },
      doc,
    ];
  });

export type AliasResponse = ApiResponse<{
  [indexName: string]: {
    aliases: {
      [aliasName: string]: {};
    };
  };
}>;

export type SettingsResponse = ApiResponse<{
  [indexName: string]: {
    settings: {
      index: {
        number_of_shards: string;
        number_of_replicas: string;
      };
    };
  };
}>;

export const getLatestIndexName = async (
  esClient: Client,
  programId: string
): Promise<string> => {
  const result = (await esClient.indices.getAlias({
    name: rollcallConfig.aliasName,
  })) as AliasResponse;

  const indexNameList = Object.entries(result.body).map(
    ([indexName, alias]) => {
      return indexName;
    }
  );

  let latestIndexName = indexNameList.find((indexName) =>
    indexName.includes(generateIndexName(programId))
  );

  latestIndexName = latestIndexName === undefined ? "" : latestIndexName;
  return latestIndexName;
};

export const getIndexSettings = async (
  esClient: Client,
  indexName: string
): Promise<SettingsResponse> => {
  const response = (await esClient.indices.getSettings({
    index: indexName,
  })) as SettingsResponse;
  return response;
};

export const setIndexWritable = async (
  esClient: Client,
  indexName: string,
  enabled: boolean
): Promise<SettingsResponse> =>
  await esClient.indices.putSettings({
    index: indexName.toLowerCase(),
    body: {
      settings: {
        // This looks backwards, but if index.blocks.write is true then the index cannot be written to. it BLOCKS any writing
        //  https://www.elastic.co/guide/en/elasticsearch/reference/master/index-modules-blocks.html
        "index.blocks.write": !enabled,
      },
    },
  });
