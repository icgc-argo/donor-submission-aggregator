import dotenv from "dotenv";
import path from "path";

export const APP_DIR = __dirname;

dotenv.config({
  path: path.resolve(APP_DIR, "../.env")
});

export const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/clinical";
export const MONGO_USER = process.env.MONG_OUSER;
export const MONGO_PASS = process.env.MONGO_PASS;

export const ES_HOST = process.env.ES_HOST || "http://localhost:9200";

export const ROLLCALL_SERVICE_ROOT =
  process.env.ROLLCALL_SERVICE_ROOT || "http://localhost:9001";
export const ROLLCALL_INDEX_ENTITY =
  process.env.ROLLCALL_INDEX_ENTITY || "donor";
export const ROLLCALL_INDEX_TYPE = process.env.ROLLCALL_INDEX_TYPE || "centric";
export const ROLLCALL_INDEX_SHARDPREFIX =
  process.env.ROLLCALL_INDEX_SHARDPREFIX || "pgm";

export const STREAM_CHUNK_SIZE = Number(process.env.STREAM_CHUNK_SIZE) || 1000;

export const CLINICAL_PROGRAM_UPDATE_TOPIC =
  process.env.CLINICAL_PROGRAM_UPDATE_TOPIC || "PROGRAM_UPDATE";

export const KAFKA_CONSUMER_GROUP =
  process.env.KAFKA_CONSUMER_GROUP || "donor-submission-aggregator";

const kafkaBrokers = process.env.KAFKA_CONSUMER_GROUP
  ? String(process.env.KAFKA_CONSUMER_GROUP)
      .split(",")
      .map(str => str.trim())
  : [];
export const KAFKA_BROKERS = kafkaBrokers.length
  ? kafkaBrokers
  : ["localhost:9092"];
export const PARTITIONS_CONSUMED_CONCURRENTLY = process.env
  .PARTITIONS_CONSUMED_CONCURRENTLY
  ? Number(process.env.PARTITIONS_CONSUMED_CONCURRENTLY)
  : 10;
export const PORT = Number(process.env.PORT || 7000);

export const ENABLED = process.env.ENABLED === "true";

/**
 * VAULT configurations
 */
export const USE_VAULT = process.env.USE_VAULT === "true";
export const VAULT_TOKEN = process.env.VAULT_TOKEN as string;
export const VAULT_AUTH_METHOD = process.env.VAULT_AUTH_METHOD as
  | "token"
  | "kubernetes";
export const VAULT_URL = process.env.VAULT_URL as string;
export const VAULT_ROLE = process.env.VAULT_ROLE as string;
export const VAULT_K8_TOKEN_PATH = process.env.VAULT_K8_TOKEN_PATH as string;
export const VAULT_MONGO_SECRET_PATH = process.env
  .VAULT_MONGO_SECRET_PATH as string;
const REQUIRED_VAULT_CONFIGS = {
  VAULT_AUTH_METHOD,
  VAULT_URL,
  VAULT_ROLE,
  VAULT_MONGO_SECRET_PATH
};
const missingValue = ([key, value]: [string, any]) => !value;
if (USE_VAULT && Object.entries(REQUIRED_VAULT_CONFIGS).some(missingValue)) {
  const error = new Error(
    `USE_VAULT is true but missing configs: ${Object.entries(
      REQUIRED_VAULT_CONFIGS
    )
      .filter(missingValue)
      .map(([key]) => key)}`
  );
  throw error;
}
const REQUIRED_K8_CONFIGS = {
  VAULT_K8_TOKEN_PATH,
  VAULT_ROLE
};
if (USE_VAULT && VAULT_AUTH_METHOD === "kubernetes") {
  if (Object.entries(REQUIRED_K8_CONFIGS).some(missingValue)) {
    const error = new Error(
      `VAULT_AUTH_METHOD is "kubernetes" but missing configs: ${Object.entries(
        REQUIRED_K8_CONFIGS
      )
        .filter(missingValue)
        .map(([key]) => key)}`
    );
    throw error;
  }
}
