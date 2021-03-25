import {
  KAFKA_PROGRAM_QUEUE_TOPIC,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP,
  KAFKA_PROGRAM_QUEUE_CONSUMER_HEARTBEAT_INTERVAL,
  KAFKA_PROGRAM_QUEUE_CONSUMER_SESSION_TIMEOUT,
  KAFKA_PROGRAM_QUEUE_CONSUMER_REBALANCE_TIMEOUT,
} from "config";
import { ProducerRecord, Kafka } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient } from "rollCall/types";
import logger from "logger";
import initializeProgramQueueTopic from "./initializeProgramQueueTopic";
import { ProgramQueueProcessor, QueueRecord, KnownEventType } from "./types";
import createEventProcessor from "./eventProcessor";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import fetchDonorIdsByAnalysis from "rdpc/query/fetchDonorIdsByAnalysis";
import { EgoJwtManager } from "auth";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import fetchVariantCallingAnalyses from "rdpc/query/fetchVariantCallingAnalyses";

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
  egoJwtManager,
  rollCallClient,
  statusReporter,
  analysisFetcher = fetchAnalyses,
  analysisWithSpecimensFetcher = fetchAnalysesWithSpecimens,
  fetchVC = fetchVariantCallingAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
}: {
  kafka: Kafka;
  esClient: Client;
  rollCallClient: RollCallClient;
  egoJwtManager: EgoJwtManager;
  statusReporter?: StatusReporter;
  analysisFetcher?: typeof fetchAnalyses;
  analysisWithSpecimensFetcher?: typeof fetchAnalysesWithSpecimens;
  fetchVC?: typeof fetchVariantCallingAnalyses;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
}): Promise<ProgramQueueProcessor> => {
  const consumer = kafka.consumer({
    groupId: KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP,
    heartbeatInterval: Number(KAFKA_PROGRAM_QUEUE_CONSUMER_HEARTBEAT_INTERVAL),
    sessionTimeout: Number(KAFKA_PROGRAM_QUEUE_CONSUMER_SESSION_TIMEOUT),
    rebalanceTimeout: Number(KAFKA_PROGRAM_QUEUE_CONSUMER_REBALANCE_TIMEOUT),
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

  const sendDlqMessage = async (dlqTopic: string, messageJSON: string) => {
    const result = await producer.send({
      topic: dlqTopic,
      messages: [
        {
          value: JSON.stringify(messageJSON),
        },
      ],
    });
    logger.debug(
      `message is sent to DLQ topic ${dlqTopic}, response: ${JSON.stringify(
        result
      )}`
    );
  };

  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: await createEventProcessor({
      esClient,
      programQueueTopic,
      egoJwtManager,
      rollCallClient,
      analysisFetcher,
      analysisWithSpecimensFetcher,
      fetchVC,
      statusReporter,
      fetchDonorIds,
      sendDlqMessage,
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
    sendDlqMessage: sendDlqMessage,
    destroy: async () => {
      await consumer.stop();
      await Promise.all([consumer.disconnect(), producer.disconnect()]);
    },
  };
};

export default createProgramQueueProcessor;
