import {
  KAFKA_PROGRAM_QUEUE_TOPIC,
  KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS,
} from "config";
import { Kafka } from "kafkajs";
import logger from "logger";

export default async (kafka: Kafka) => {
  const topic = KAFKA_PROGRAM_QUEUE_TOPIC;
  const partitionCount = KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS;
  logger.info(
    `creating program queue topic ${topic} with ${partitionCount} partitions`
  );
  const kafkaAdmin = kafka.admin();
  try {
    await kafkaAdmin.connect();
    logger.info("connected kafka admin");
    logger.info(`existing kafka topics: ${await kafkaAdmin.listTopics()}`);
    const isTopicCreated = await kafkaAdmin.createTopics({
      topics: [
        {
          topic,
          numPartitions: partitionCount,
        },
      ],
    });
    logger.info(
      `existing kafka topics after creation: ${await kafkaAdmin.listTopics()}`
    );
    await kafkaAdmin.disconnect();
    logger.info("disconnected kafka admin");
    logger.info(`created topic ${topic} for queuing: ${isTopicCreated}`);
    return topic;
  } catch (err) {
    logger.error(
      `failed to create topic ${topic} with ${partitionCount} partitions`
    );
    throw err;
  }
};
