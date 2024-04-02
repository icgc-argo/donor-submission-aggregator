import dotenv from "dotenv";
import path from "path";

export type RollcallConfig = {
  rootUrl: string;
  aliasName: string;
  indexEntity: string;
  indexType: string;
  shardPrefix: string;
};
export interface KafkaConsumerConfiguration {
  topic: string;
  group: string;
  dlq?: string;

  partitionsConsumedConcurrently?: number;
  heartbeatInterval?: number;
  sessionTimeout?: number;
  rebalanceTimeout?: number;
}
export interface KafkaProducerConfiguration {
  topic: string;
}

export interface KafkaTopicConfiguration {
  topic: string;
  partitions: number;
}

export const APP_DIR = __dirname;

dotenv.config({
  path: path.resolve(APP_DIR, "../.env"),
});

export const PORT = Number(process.env.PORT || 7000);

export const EGO_URL_RDPC = process.env.EGO_URL_RDPC || "http://localhost:8081";
export const EGO_URL_DCC = process.env.EGO_URL_DCC || "http://localhost:8081";

export const EGO_APP_RDPC_CLIENT_ID =
  process.env.EGO_APP_RDPC_CLIENT_ID || "donor-submission-aggregator-rdpc";
export const EGO_APP_RDPC_CLIENT_SECRET =
  process.env.EGO_APP_RDPC_CLIENT_SECRET || "top-secret";
export const EGO_APP_DCC_CLIENT_ID =
  process.env.EGO_APP_DCC_CLIENT_ID || "donor-submission-aggregator-dcc";
export const EGO_APP_DCC_CLIENT_SECRET =
  process.env.EGO_APP_RDPC_CLIENT_SECRET || "top-secret";

export const EGO_PUBLIC_KEY = process.env.EGO_PUBLIC_KEY as string;
export const RDPC_URL = process.env.RDPC_URL || "http://localhost:8000";

export const FILES_SERVICE_URL =
  process.env.FILES_SERVICE_URL || "http://localhost:8000";

export const CLINICAL_URL = process.env.CLINICAL_URL || "http://localhost:3000";

export const ES_HOST = process.env.ES_HOST || "http://localhost:9200";
export const ES_CLIENT_TRUST_SSL_CERT =
  process.env.ES_CLIENT_TRUST_SSL_CERT === "true";

export const rollcallConfig: RollcallConfig = {
  rootUrl: process.env.ROLLCALL_SERVICE_ROOT || "http://localhost:9001",
  aliasName: process.env.ROLLCALL_ALIAS_NAME || "donor_submission_summary",
  indexEntity: process.env.ROLLCALL_INDEX_ENTITY || "donor",
  indexType: process.env.ROLLCALL_INDEX_TYPE || "centric",
  shardPrefix: process.env.ROLLCALL_INDEX_SHARDPREFIX || "program",
};

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

export const RNA_SEQ_ALIGN_REPO_URL =
  process.env.RNA_SEQ_ALIGN_REPO_URL ||
  "https://github.com/icgc-argo-workflows/rna-seq-alignment.git";

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
export const DEFAULT_HEARTBEAT_INTERVAL = 12 * 1000;

export const KAFKA_PROGRAM_QUEUE_TOPIC =
  process.env.KAFKA_PROGRAM_QUEUE_TOPIC || "donor_aggregator_program_queues";

const DLQ_TOPIC_NAME = process.env.DLQ_TOPIC_NAME || "donor_aggregator_dlq";

const KAFKA_CONSUMER_GROUP =
  process.env.KAFKA_CONSUMER_GROUP || "donor-submission-aggregator";

const clinicalUpdatesConsumer: KafkaConsumerConfiguration = {
  group: `${KAFKA_CONSUMER_GROUP}_clinical_update`,
  topic: process.env.CLINICAL_PROGRAM_UPDATE_TOPIC || "PROGRAM_UPDATE",
  dlq: DLQ_TOPIC_NAME,
};
const filePublicReleasesConsumer: KafkaConsumerConfiguration = {
  group: `${KAFKA_CONSUMER_GROUP}_file_public_release`,
  topic: process.env.KAFKA_PUBLIC_RELEASE_TOPIC || "files_public_release",
  dlq: DLQ_TOPIC_NAME,
};
const rdpcAnalysisUpdatesConsumer: KafkaConsumerConfiguration = {
  group: `${KAFKA_CONSUMER_GROUP}_rdpc`,
  topic: process.env.RDPC_PROGRAM_UPDATE_TOPIC || "song_analysis",
  dlq: DLQ_TOPIC_NAME,
};
const programQueueConsumer: KafkaConsumerConfiguration = {
  group:
    process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP ||
    "program-queue-donor-processor",
  topic: KAFKA_PROGRAM_QUEUE_TOPIC,
  dlq: DLQ_TOPIC_NAME,

  partitionsConsumedConcurrently: Number(
    process.env.PARTITIONS_CONSUMED_CONCURRENTLY || 5
  ),

  // HeartbeatInterval: Default 12*1000 = 12 seconds:
  heartbeatInterval:
    Number(process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_HEARTBEAT_INTERVAL) ||
    DEFAULT_HEARTBEAT_INTERVAL,
  // Session Timeout: Default 120*1000 = 2 minutes, allows 1/10 heartbeat successes to stay connected
  sessionTimeout:
    Number(process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_SESSION_TIMEOUT) ||
    120 * 1000,
  // Rebalance Timeout: Default 240*1000 = 4 minutes. Rebalance is the time kafka will wait for consumer to reconnect while rebalancing.
  // If you are experiencing long startup times waiting for kafka connection, this is the likely culprit.
  rebalanceTimeout:
    Number(process.env.KAFKA_PROGRAM_QUEUE_CONSUMER_REBALANCE_TIMEOUT) ||
    240 * 1000,
};
const programQueueProducer: KafkaProducerConfiguration = {
  topic: KAFKA_PROGRAM_QUEUE_TOPIC,
};
const programQueueTopic: KafkaTopicConfiguration = {
  topic: KAFKA_PROGRAM_QUEUE_TOPIC,
  partitions: Number(process.env.KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS || 5),
};
export const kafkaConfig = {
  brokers: process.env.KAFKA_BROKERS
    ? String(process.env.KAFKA_BROKERS)
        .split(",")
        .map((str) => str.trim())
    : ["localhost:9092"],
  consumers: {
    clinicalUpdates: clinicalUpdatesConsumer,
    filePublicReleases: filePublicReleasesConsumer,
    programQueue: programQueueConsumer,
    rdpcAnalysisUpdates: rdpcAnalysisUpdatesConsumer,
  },
  producers: { programQueue: programQueueProducer },
  topics: {
    programQueue: programQueueTopic,
  },
};

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
export const VAULT_EGO_SECRET_PATH = process.env
  .VAULT_EGO_SECRET_PATH as string;
export const VAULT_SECRET_PATH_EGO_APP_RDPC =
  process.env.VAULT_SECRET_PATH_EGO_APP_RDPC;
export const VAULT_SECRET_PATH_EGO_APP_DCC =
  process.env.VAULT_SECRET_PATH_EGO_APP_DCC;
const REQUIRED_VAULT_CONFIGS = {
  VAULT_AUTH_METHOD,
  VAULT_URL,
  VAULT_ROLE,
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

/**
 * FEATURE FLAGS!
 */
// Index data from RDPC
export const FEATURE_RDPC_INDEXING_ENABLED =
  process.env.FEATURE_RDPC_INDEXING_ENABLED === "true";

// Index data from File Service
export const FEATURE_INDEX_FILE_ENABLED =
  process.env.FEATURE_INDEX_FILE_ENABLED === "true";

// Default enable kafka unless this flag is provided with value = false
export const FEATURE_DEV_DISABLE_KAFKA =
  process.env.FEATURE_DEV_DISABLE_KAFKA === "true";

export const featureFlags = {
  index: {
    rdpc: FEATURE_RDPC_INDEXING_ENABLED,
    files: FEATURE_INDEX_FILE_ENABLED,
  },
  kafka: !FEATURE_DEV_DISABLE_KAFKA,
};

/**
 * GraphQL
 */
export const GRAPHQL_PORT =
  Number.parseInt(process.env.GRAPHQL_PORT || "") || 3001;

/**
 * Elasticsearch
 */

export const ELASTICSEARCH_PROGRAM_DONOR_DASHBOARD_INDEX =
  process.env.ELASTICSEARCH_PROGRAM_DONOR_DASHBOARD_INDEX || "donor_centric";

export const ENABLE_ELASTICSEARCH_LOGGING =
  process.env.ENABLE_ELASTICSEARCH_LOGGING === "true";

/**
 * RDPC
 */
export const RDPC_CODE = process.env.RDPC_CODE || "";
