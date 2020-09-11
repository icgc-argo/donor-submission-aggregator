import {
  KAFKA_PROGRAM_QUEUE_TOPIC,
  KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS,
} from "config";
import { Kafka } from "kafkajs";
import logger from "logger";

export default async (kafka: Kafka) => {
  const kafkaAdmin = kafka.admin();
  try {
    await kafkaAdmin.connect();
    await kafkaAdmin.createTopics({
      topics: [
        {
          topic: KAFKA_PROGRAM_QUEUE_TOPIC,
          numPartitions: KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS,
        },
      ],
    });
    await kafkaAdmin.disconnect();
    logger.info(`created topic ${KAFKA_PROGRAM_QUEUE_TOPIC} for queuing`);
    return KAFKA_PROGRAM_QUEUE_TOPIC;
  } catch (err) {
    logger.error(
      `failed to create topic ${KAFKA_PROGRAM_QUEUE_TOPIC} with ${KAFKA_PROGRAM_QUEUE_TOPIC_PARTITIONS} partitions`
    );
    throw err;
  }
};
