import dotenv from "dotenv";
dotenv.config();

export const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/clinical";
export const MONGO_USER = process.env.MONG_OUSER;
export const MONGO_PASS = process.env.MONGO_PASS;

export const ES_HOST = process.env.ES_HOST || "http://localhost:9200";

export const ROLLCALL_SERVICE_ROOT = process.env.ROLLCALL_SERVICE_ROOT || "http://localhost:9001";
export const ROLLCALL_INDEX_ENTITY = process.env.ROLLCALL_INDEX_ENTITY || "donor";
export const ROLLCALL_INDEX_TYPE = process.env.ROLLCALL_INDEX_TYPE || "centric";
export const ROLLCALL_INDEX_SHARDPREFIX = process.env.ROLLCALL_INDEX_SHARDPREFIX || "pgm";

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
