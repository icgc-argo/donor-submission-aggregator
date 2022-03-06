import { Client } from "@elastic/elasticsearch";
import { kafkaConfig } from "config";
import { getFilesByProgramId } from "files/getFilesByProgramId";
import { Kafka, ProducerRecord } from "kafkajs";
import logger from "logger";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import fetchDonorIdsByAnalysis from "rdpc/query/fetchDonorIdsByAnalysis";
import fetchVariantCallingAnalyses from "rdpc/query/fetchVariantCallingAnalyses";
import { RollCallClient } from "rollCall/types";
import { StatusReporter } from "statusReport";
import createEventProcessor from "./eventProcessor";
import { KnownEventType, ProgramQueueProcessor, QueueRecord } from "./types";

const consumerConfig = kafkaConfig.consumers.programQueue;

const createProgramQueueRecord = (record: QueueRecord): ProducerRecord => {
  return {
    topic: consumerConfig.topic,
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
  analysesFetcher = fetchAnalyses,
  analysesWithSpecimensFetcher = fetchAnalysesWithSpecimens,
  fetchVC = fetchVariantCallingAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
  fileData = getFilesByProgramId,
}: {
  kafka: Kafka;
  esClient: Client;
  rollCallClient: RollCallClient;
  statusReporter?: StatusReporter;
  analysesFetcher?: typeof fetchAnalyses;
  analysesWithSpecimensFetcher?: typeof fetchAnalysesWithSpecimens;
  fetchVC?: typeof fetchVariantCallingAnalyses;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
  fileData?: typeof getFilesByProgramId;
}): Promise<ProgramQueueProcessor> => {
  const consumer = kafka.consumer({
    groupId: consumerConfig.topic,
    heartbeatInterval: consumerConfig.heartbeatInterval,
    sessionTimeout: consumerConfig.sessionTimeout,
    rebalanceTimeout: consumerConfig.rebalanceTimeout,
  });
  const producer = kafka.producer();
  const programQueueTopic = consumerConfig.topic;
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
    partitionsConsumedConcurrently:
      kafkaConfig.consumers.programQueue.partitionsConsumedConcurrently,
    eachMessage: createEventProcessor({
      esClient,
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
