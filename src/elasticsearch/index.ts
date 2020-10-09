import {
  ES_HOST,
  VAULT_ES_SECRET_PATH,
  USE_VAULT,
  ES_CLIENT_TRUST_SSL_CERT,
} from "config";
import flatMap from "lodash/flatMap";
import esMapping from "./donorIndexMapping.json";
import { Client, Transport } from "@elastic/elasticsearch";
import { loadVaultSecret } from "vault";
import logger from "logger";

type EsSecret = {
  user: string;
  pass: string;
};

const isEsSecret = (data: { [k: string]: any }): data is EsSecret => {
  return typeof data["user"] === "string" && typeof data["pass"] === "string";
};

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
    console.log(logger);
    logger.info(`esClient failed to connect to cluster`);
    throw err;
  }
  logger.info(`successfully created Elasticsearch client for ${ES_HOST}`);
  return esClient;
};

export const initIndexMapping = async (index: string, esClient: Client) => {
  const serializedIndexName = index.toLowerCase();
  await esClient.indices.putMapping({
    index: serializedIndexName,
    body: esMapping.mappings,
  });
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
