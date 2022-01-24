import dotenv from "dotenv";
import path from "path";

export const APP_DIR = __dirname;

dotenv.config({
  path: path.resolve(APP_DIR, "../.env"),
});

export const EGO_URL = process.env.EGO_URL || "http://localhost:8081";
export const EGO_CLIENT_ID =
  process.env.EGO_CLIENT_ID || "donor-submission-aggregator";
export const EGO_CLIENT_SECRET =
  process.env.EGO_CLIENT_SECRET || "donor-submission-aggregator-secret";
export const EGO_PUBLIC_KEY = process.env.EGO_PUBLIC_KEY as string;
export const RDPC_URL = process.env.RDPC_URL || "http://localhost:8000";

export const FILES_SERVICE_URL =
  process.env.FILES_SERVICE_URL || "http://localhost:8000";
export const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/clinical";
export const MONGO_USER = process.env.MONGO_USER;
export const MONGO_PASS = process.env.MONGO_PASS;

export const ES_HOST = process.env.ES_HOST || "http://localhost:9200";
export const ES_CLIENT_TRUST_SSL_CERT =
  process.env.ES_CLIENT_TRUST_SSL_CERT === "true";

export const ROLLCALL_SERVICE_ROOT =
  process.env.ROLLCALL_SERVICE_ROOT || "http://localhost:9001";
export const ROLLCALL_ALIAS_NAME =
  process.env.ROLLCALL_ALIAS_NAME || "donor_submission_summary";
export const ROLLCALL_INDEX_ENTITY =
  process.env.ROLLCALL_INDEX_ENTITY || "donor";
export const ROLLCALL_INDEX_TYPE = process.env.ROLLCALL_INDEX_TYPE || "centric";
export const ROLLCALL_INDEX_SHARDPREFIX =
  process.env.ROLLCALL_INDEX_SHARDPREFIX || "program";

export const STREAM_CHUNK_SIZE =
  !Number(process.env.STREAM_CHUNK_SIZE) ||
  Number(process.env.STREAM_CHUNK_SIZE) <= 0
    ? 100
    : Number(process.env.STREAM_CHUNK_SIZE);

export const FILES_STREAM_SIZE =
  !Number(process.env.FILE_STREAM_SIZE) ||
  Number(process.env.FILE_STREAM_SIZE) <= 0
    ? 100
    : Number(process.env.FILE_STREAM_SIZE);

export const SEQ_ALIGN_REPO_URL =
  process.env.SEQ_ALIGN_REPO_URL ||
  "https://github.com/icgc-argo/dna-seq-processing-wfs.git";

export const SANGER_VC_REPO_URL =
  process.env.SANGER_VC_REPO_URL ||
  "https://github.com/icgc-argo/sanger-variant-calling.git";

export const MUTECT_REPO_URL =
  process.env.MUTECT_REPO_URL ||
  "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git";

/**
 * Open Access repo URL currently only works with the `.git` omitted
 * Ticket to fix: https://github.com/icgc-argo/workflow-roadmap/issues/211
 */
export const OPEN_ACCESS_REPO_URL =
  process.env.OPEN_ACCESS_REPO_URL ||
  "https://github.com/icgc-argo-workflows/open-access-variant-filtering";

/**
 * Kafka Configs
 */
export const KAFKA_PUBLIC_RELEASE_TOPIC =
  process.env.KAFKA_PUBLIC_RELEASE_TOPIC || "files_public_release";

export const CLINICAL_PROGRAM_UPDATE_TOPIC =
  process.env.CLINICAL_PROGRAM_UPDATE_TOPIC || "PROGRAM_UPDATE";

export const RDPC_PROGRAM_UPDATE_TOPIC =
  process.env.RDPC_PROGRAM_UPDATE_TOPIC || "song_analysis";

export const KAFKA_PROGRAM_QUEUE_TOPIC =
  process.env.KAFKA_PROGRAM_QUEUE_TOPIC || "donor_aggregator_program_queues";

export const DLQ_TOPIC_NAME =
  process.env.DLQ_TOPIC_NAME || "donor_aggregator_dlq";

// Default 12*1000 = 12 seconds
export const KAFKA_PROGRAM_QUEUE_CONSUMER_HEARTBEAT_INTERVAL =
  Number(process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_HEARTBEAT_INTERVAL) ||
  12 * 1000;

// Default 120*1000 = 2 minutes, allows 1/10 heartbeat successes to stay connected
export const KAFKA_PROGRAM_QUEUE_CONSUMER_SESSION_TIMEOUT =
  Number(process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_SESSION_TIMEOUT) ||
  120 * 1000;

// Default 240*1000 = 4 minutes. Rebalance is the time kafka will wait for consumer to reconnect while rebalancing.
// If you are experiencing long startup times waiting for kafka connection, this is the likely culprit.
export const KAFKA_PROGRAM_QUEUE_CONSUMER_REBALANCE_TIMEOUT =
  Number(process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_REBALANCE_TIMEOUT) ||
  240 * 1000;

export const KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP =
  process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP ||
  "program-queue-donor-processor";
export const KAFKA_CONSUMER_GROUP =
  process.env.KAFKA_CONSUMER_GROUP || "donor-submission-aggregator";

const kafkaBrokers = process.env.KAFKA_BROKERS
  ? String(process.env.KAFKA_BROKERS)
      .split(",")
      .map((str) => str.trim())
  : [];
export const KAFKA_BROKERS = kafkaBrokers.length
  ? kafkaBrokers
  : ["localhost:9092"];
export const PARTITIONS_CONSUMED_CONCURRENTLY = Number(
  process.env.PARTITIONS_CONSUMED_CONCURRENTLY || 5
);
export const KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS = Number(
  process.env.KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS || 5
);
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
export const VAULT_ES_SECRET_PATH = process.env.VAULT_ES_SECRET_PATH as string;
export const VAULT_MONGO_SECRET_PATH = process.env
  .VAULT_MONGO_SECRET_PATH as string;
export const VAULT_EGO_SECRET_PATH = process.env
  .VAULT_EGO_SECRET_PATH as string;
const REQUIRED_VAULT_CONFIGS = {
  VAULT_AUTH_METHOD,
  VAULT_URL,
  VAULT_ROLE,
  VAULT_MONGO_SECRET_PATH,
  VAULT_ES_SECRET_PATH,
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
  VAULT_ROLE,
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

export const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 5;

export const RETRY_CONFIG_RDPC_GATEWAY = {
  factor: 2,
  retries: MAX_RETRIES,
  minTimeout: 1000,
  maxTimeout: Infinity,
};

export const FEATURE_RDPC_INDEXING_ENABLED =
  process.env.FEATURE_RDPC_INDEXING_ENABLED === "true";

export const FEATURE_INDEX_FILE_ENABLED =
  process.env.FEATURE_INDEX_FILE_ENABLED === "true";
