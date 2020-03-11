import { ES_HOST, VAULT_ES_SECRET_PATH, USE_VAULT } from "config";
import flatMap from "lodash/flatMap";
import esMapping from "./donorIndexMapping.json";
import { Client } from "@elastic/elasticsearch";
import { loadVaultSecret } from "vault/index.js";
import logger from "logger.js";

type EsSecret = {
  user: string;
  pass: string;
};

const isEsSecret = (data: { [k: string]: any }): data is EsSecret => {
  return typeof data["user"] === "string" && typeof data["pass"] === "string";
};

const createEsClient = async () => {
  if (USE_VAULT) {
    const secretData = await loadVaultSecret()(VAULT_ES_SECRET_PATH).catch(
      err => {
        logger.error(
          `could not read Elasticsearch secret at path ${VAULT_ES_SECRET_PATH}`
        );
        throw err;
      }
    );
    if (isEsSecret(secretData)) {
      return new Client({
        node: ES_HOST,
        auth: {
          username: secretData.user,
          password: secretData.pass
        }
      });
    }
    throw new Error(
      `vault secret at ${VAULT_ES_SECRET_PATH} could not be read`
    );
  }
  return new Client({
    node: ES_HOST
  });
};

export const initIndexMapping = async (
  index: string,
  esClientPromise = createEsClient()
) => {
  const serializedIndexName = index.toLowerCase();
  await (await esClientPromise).indices.putMapping({
    index: serializedIndexName,
    body: esMapping.mappings
  });
};

export const toEsBulkIndexActions = (indexName: string) => <T>(
  docs: Array<T>
) => flatMap(docs, doc => [{ index: { _index: indexName } }, doc]);
