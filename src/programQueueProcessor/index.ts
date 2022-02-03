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
import { getFilesByProgramId } from "files/getFilesByProgramId";

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
  analysesFetcher = fetchAnalyses,
  analysesWithSpecimensFetcher = fetchAnalysesWithSpecimens,
  fetchVC = fetchVariantCallingAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
  fileData = getFilesByProgramId,
}: {
  kafka: Kafka;
  esClient: Client;
  rollCallClient: RollCallClient;
  egoJwtManager: EgoJwtManager;
  statusReporter?: StatusReporter;
  analysesFetcher?: typeof fetchAnalyses;
  analysesWithSpecimensFetcher?: typeof fetchAnalysesWithSpecimens;
  fetchVC?: typeof fetchVariantCallingAnalyses;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
  fileData?: typeof getFilesByProgramId;
}): Promise<ProgramQueueProcessor> => {
  const consumer = kafka.consumer({
    groupId: KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP,
    heartbeatInterval: KAFKA_PROGRAM_QUEUE_CONSUMER_HEARTBEAT_INTERVAL,
    sessionTimeout: KAFKA_PROGRAM_QUEUE_CONSUMER_SESSION_TIMEOUT,
    rebalanceTimeout: KAFKA_PROGRAM_QUEUE_CONSUMER_REBALANCE_TIMEOUT,
  });
  const producer = kafka.producer();
  const programQueueTopic = await initializeProgramQueueTopic(kafka);
  await consumer.subscribe({
    topic: programQueueTopic,
  });
  logger.info(`subscribed to topic ${programQueueTopic} for queuing`);

  const enqueueEvent = async (event: QueueRecord) => {
    await producer.send(createProgramQueueRecord(event));
    logger.debug(`enqueuing event: ${JSON.stringify(event)}`);
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
    eachMessage: createEventProcessor({
      esClient,
      egoJwtManager,
      rollCallClient,
      analysesFetcher,
      analysesWithSpecimensFetcher,
      fetchVC,
      statusReporter,
      fetchDonorIds,
      fileData,
      sendDlqMessage,
    }),
  });
  logger.info(`queue pipeline setup complete with topic ${programQueueTopic}`);

  return {
    knownEventTypes: {
      CLINICAL: KnownEventType.CLINICAL as KnownEventType.CLINICAL,
      FILE: KnownEventType.FILE_RELEASE as KnownEventType.FILE_RELEASE,
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
