import {
  KAFKA_PROGRAM_QUEUE_TOPIC,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP,
} from "config";
import { ProducerRecord, Kafka } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient } from "rollCall/types";
import logger from "logger";
import initializeProgramQueueTopic from "./initializeProgramQueueTopic";
import { ProgramQueueProcessor, QueueRecord, KnownEventType } from "./types";
import createEventProcessor from "./eventProcessor";
import fetchAnalyses from "rdpc/fetchAnalyses";
import fetchDonorIdsByAnalysis from "rdpc/fetchDonorIdsByAnalysis";

const createProgramQueueRecord = (record: QueueRecord): ProducerRecord => {
  return {
    topic: KAFKA_PROGRAM_QUEUE_TOPIC,
    messages: [
      {
        key: record.programId,
        value: JSON.stringify(record),
      },
    ],
  };
};

const createProgramQueueProcessor = async ({
  kafka,
  esClient,
  rollCallClient,
  statusReporter,
  analysisFetcher = fetchAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
}: {
  kafka: Kafka;
  esClient: Client;
  rollCallClient: RollCallClient;
  statusReporter?: StatusReporter;
  analysisFetcher?: typeof fetchAnalyses;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
}): Promise<ProgramQueueProcessor> => {
  const consumer = kafka.consumer({
    groupId: KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP,
  });
  const producer = kafka.producer();

  const programQueueTopic = await initializeProgramQueueTopic(kafka);
  await consumer.subscribe({
    topic: programQueueTopic,
  });
  logger.info(`subscribed to topic ${programQueueTopic} for queuing`);

  const enqueueEvent = async (event: QueueRecord) => {
    await producer.send(createProgramQueueRecord(event));
    logger.info(`enqueued ${event.type} event for program ${event.programId}`);
  };

  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: createEventProcessor({
      esClient,
      programQueueTopic,
      rollCallClient,
      analysisFetcher,
      statusReporter,
      fetchDonorIds,
      enqueueEvent,
    }),
  });
  logger.info(`queue pipeline setup complete with topic ${programQueueTopic}`);

  return {
    knownEventTypes: {
      CLINICAL: KnownEventType.CLINICAL as KnownEventType.CLINICAL,
      RDPC: KnownEventType.RDPC as KnownEventType.RDPC,
      SYNC: KnownEventType.SYNC as KnownEventType.SYNC,
    },
    enqueueEvent: enqueueEvent,
    destroy: async () => {
      await consumer.stop();
      await Promise.all([consumer.disconnect(), producer.disconnect()]);
    },
  };
};

export default createProgramQueueProcessor;
