import {
  CLINICAL_PROGRAM_UPDATE_TOPIC,
  KAFKA_PROGRAM_QUEUE_TOPIC,
  KAFKA_AGGREGATED_TOPIC_PARTITIONS,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  KAFKA_CONSUMER_GROUP,
} from "config";
import { ProducerRecord, KafkaMessage, Kafka } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient } from "rollCall/types";
import processProgram from "processProgram";
import parseClinicalProgramUpdateEvent from "eventParsers/parseClinicalProgramUpdateEvent";
import logger from "logger";

enum KnownEventSource {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
}
type AggregatedEvent = {
  programId: string;
  sources: Array<KnownEventSource>;
};
const dataSourceMap = {
  [CLINICAL_PROGRAM_UPDATE_TOPIC]: KnownEventSource.CLINICAL,
};

const createAggregatedEvent = ({
  sourceTopics,
  programId,
}: {
  sourceTopics: string[];
  programId: string;
}): ProducerRecord => {
  return {
    topic: KAFKA_PROGRAM_QUEUE_TOPIC,
    messages: [
      {
        key: programId,
        value: JSON.stringify({
          programId,
          sources: sourceTopics
            .map((topic) => dataSourceMap[topic])
            .filter(Boolean),
        } as AggregatedEvent),
      },
    ],
  };
};

const initializeProgramQueueTopic = async (kafka: Kafka) => {
  const kafkaAdmin = kafka.admin();
  try {
    await kafkaAdmin.connect();
    await kafkaAdmin.createTopics({
      topics: [
        {
          topic: KAFKA_PROGRAM_QUEUE_TOPIC,
          numPartitions: KAFKA_AGGREGATED_TOPIC_PARTITIONS,
        },
      ],
    });
    await kafkaAdmin.disconnect();
  } catch (err) {
    logger.error(
      `failed to create topic ${KAFKA_PROGRAM_QUEUE_TOPIC} with ${KAFKA_AGGREGATED_TOPIC_PARTITIONS} partitions`
    );
    throw err;
  }
};

const createProgramQueueManager = async ({
  kafka,
  esClient,
  statusReporter,
  rollCallClient,
}: {
  kafka: Kafka;
  esClient: Client;
  statusReporter: StatusReporter;
  rollCallClient: RollCallClient;
}) => {
  const consumer = kafka.consumer({
    groupId: KAFKA_CONSUMER_GROUP,
  });
  const producer = kafka.producer();

  await initializeProgramQueueTopic(kafka);
  await consumer.subscribe({
    topic: KAFKA_PROGRAM_QUEUE_TOPIC,
  });
  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: async ({ topic, message }) => {
      const { programId } = parseClinicalProgramUpdateEvent(
        message.value.toString()
      );
      await processProgram({
        programId,
        esClient,
        statusReporter,
        rollCallClient,
      });
    },
  });

  return {
    dataSourceMap,
    queueSourceEvent: async ({
      message,
      eventSources,
    }: {
      message: KafkaMessage;
      eventSources: KnownEventSource[];
    }) => {
      const { programId } = parseClinicalProgramUpdateEvent(
        message.value.toString()
      );
      await producer.send(
        createAggregatedEvent({
          sourceTopics: eventSources,
          programId,
        })
      );
    },
  };
};

export default createProgramQueueManager;
