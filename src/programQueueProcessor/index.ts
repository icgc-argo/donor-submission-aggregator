import {
  KAFKA_PROGRAM_QUEUE_TOPIC,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  KAFKA_PROGRAM_QUEUE_CONSUMER_GROUP,
} from "config";
import { ProducerRecord, Kafka } from "kafkajs";
import { Client } from "@elastic/elasticsearch";
import { StatusReporter } from "statusReport";
import { RollCallClient } from "rollCall/types";
import indexClinicalProgram from "indexProgram";
import { initIndexMapping } from "elasticsearch";
import withRetry from "promise-retry";
import { handleIndexingFailure } from "indexProgram/handleIndexingFailure";
import logger from "logger";
import initializeProgramQueueTopic from "./initializeProgramQueueTopic";

enum KnownEventSource {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
}
type QueuedClinicalEvent = {
  source: KnownEventSource.CLINICAL;
};
type QueuedRdpcEvent = {
  source: KnownEventSource.RDPC;
  programId: string;
  analysisId: string;
  rdpcGatewayUrl: string;
};
type QueuedProgramEventPayload = QueuedClinicalEvent | QueuedRdpcEvent;
type ProgramQueueEvent = {
  programId: string;
  changes: Array<QueuedProgramEventPayload>;
};
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
const parseProgramQueueEvent = (message: string): ProgramQueueEvent =>
  JSON.parse(message);

const createProgramQueueManager = async ({
  kafka,
  esClient,
  statusReporter,
  rollCallClient,
}: {
  kafka: Kafka;
  esClient: Client;
  statusReporter?: StatusReporter;
  rollCallClient: RollCallClient;
}) => {
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
    eachMessage: async ({ message }) => {
      if (message && message.value) {
        const queuedEvent = parseProgramQueueEvent(message.value.toString());
        const { programId } = queuedEvent;
        const retryConfig = {
          factor: 2,
          retries: 100,
          minTimeout: 1000,
          maxTimeout: Infinity,
        };
        await withRetry(async (retry, attemptIndex) => {
          const newResolvedIndex = await rollCallClient.createNewResolvableIndex(
            programId.toLowerCase()
          );
          logger.info(`obtained new index name: ${newResolvedIndex.indexName}`);
          try {
            await initIndexMapping(newResolvedIndex.indexName, esClient);
            for (const change of queuedEvent.changes) {
              if (change.source === KnownEventSource.CLINICAL) {
                await indexClinicalProgram(
                  programId,
                  newResolvedIndex.indexName,
                  esClient
                );
              } else if (change.source === KnownEventSource.RDPC) {
                console.log(change.analysisId);
              }
            }

            await rollCallClient.release(newResolvedIndex);
          } catch (err) {
            logger.warn(
              `failed to index program ${programId} on attempt #${attemptIndex}: ${err}`
            );
            await handleIndexingFailure({
              esClient: esClient,
              rollCallIndex: newResolvedIndex,
            });
            retry(err);
          }
        }, retryConfig).catch((err) => {
          logger.error(
            `FAILED TO INDEX PROGRAM ${programId} after ${retryConfig.retries} attempts: ${err}`
          );
          throw err;
        });
        statusReporter?.endProcessingProgram(programId);
      } else {
        throw new Error(`missing message from a ${programQueueTopic}`);
      }
    },
  });

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

export default createProgramQueueManager;
