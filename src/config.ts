export const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/clinical";
export const MONGO_USER = process.env.MONG_OUSER || "http://localhost:9200";
export const MONGO_PASS = process.env.MONGO_PASS || "http://localhost:9200";

export const ES_HOST = process.env.ES_HOST || "http://localhost:9200";

export const STREAM_CHUNK_SIZE = Number(process.env.STREAM_CHUNK_SIZE) || 1000;

export const CLINICAL_PROGRAM_UPDATE_TOPIC =
  process.env.CLINICAL_PROGRAM_UPDATE_TOPIC || "PROGRAM_UPDATE";

export const KAFKA_CONSUMER_GROUP =
  process.env.KAFKA_CONSUMER_GROUP || "donor-submission-aggregator";

const kafkaBrokers = process.env.KAFKA_CONSUMER_GROUP
  ? String(process.env.KAFKA_CONSUMER_GROUP)
      .split(" ")
      .join("")
      .split(",")
  : [];
export const KAFKA_BROKERS = kafkaBrokers.length
  ? kafkaBrokers
  : ["localhost:9092"];
export const PARTITIONS_CONSUMED_CONCURRENTLY = process.env
  .PARTITIONS_CONSUMED_CONCURRENTLY
  ? Number(process.env.PARTITIONS_CONSUMED_CONCURRENTLY)
  : 10;
