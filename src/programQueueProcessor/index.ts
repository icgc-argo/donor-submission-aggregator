import {
  KAFKA_PROGRAM_QUEUE_TOPIC,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP,
} from "config";
import { ProducerRecord, Kafka } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient, ResolvedIndex } from "rollCall/types";
import logger from "logger";
import initializeProgramQueueTopic from "./initializeProgramQueueTopic";
import {
  QueuedProgramEventPayload,
  ProgramQueueEvent,
  KnownEventSource,
  ProgramQueueProcessor,
} from "./types";
import createEventProcessor from "./eventProcessor";

const createProgramQueueRecord = ({
  changes,
  programId,
}: {
  changes: QueuedProgramEventPayload[];
  programId: string;
}): ProducerRecord => {
  return {
    topic: KAFKA_PROGRAM_QUEUE_TOPIC,
    messages: [
      {
        key: programId,
        value: JSON.stringify({
          programId,
          changes,
        } as ProgramQueueEvent),
      },
    ],
  };
};

const createProgramQueueProcessor = async ({
  kafka,
  esClient,
  statusReporter,
  rollCallClient,
}: {
  kafka: Kafka;
  esClient: Client;
  statusReporter?: StatusReporter;
  rollCallClient: RollCallClient;
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
  await consumer.run({
    partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
    eachMessage: createEventProcessor({
      esClient,
      programQueueTopic,
      rollCallClient,
      statusReporter,
    }),
  });
  logger.info(`queue pipeline setup complete with topic ${programQueueTopic}`);

  return {
    knownEventSource: {
      CLINICAL: KnownEventSource.CLINICAL as KnownEventSource.CLINICAL,
      RDPC: KnownEventSource.RDPC as KnownEventSource.RDPC,
    },
    enqueueEvent: async ({
      changes,
      programId,
    }: {
      changes: Array<QueuedProgramEventPayload>;
      programId: string;
    }) => {
      await producer.send(
        createProgramQueueRecord({
          changes,
          programId,
        })
      );
      logger.info(`enqueued event for program ${programId}`);
    },
    destroy: async () => {
      await consumer.stop();
      await Promise.all([consumer.disconnect(), producer.disconnect()]);
    },
  };
};

export default createProgramQueueProcessor;
