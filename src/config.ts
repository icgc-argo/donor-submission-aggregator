export const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/clinical";
export const MONGO_USER = process.env.MONG_OUSER || "http://localhost:9200";
export const MONGO_PASS = process.env.MONGO_PASS || "http://localhost:9200";

export const ES_HOST = process.env.ES_HOST || "http://localhost:9200";

export const STREAM_CHUNK_SIZE = Number(process.env.STREAM_CHUNK_SIZE) || 1000;
