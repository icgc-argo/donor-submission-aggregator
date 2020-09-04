import createRollCallClient from "rollCall";

import { createEsClient } from "elasticsearch";
import connectMongo from "clinicalMongo";
import { Kafka, ProducerRecord } from "kafkajs";
import * as swaggerUi from "swagger-ui-express";
import path from "path";
import yaml from "yamljs";
import express from "express";

import toClinicalProgramUpdateEvent from "toClinicalProgramUpdateEvent";
import {
  CLINICAL_PROGRAM_UPDATE_TOPIC,
  PROGRAM_QUEUE_TOPIC,
  KAFKA_CONSUMER_GROUP,
  KAFKA_BROKERS,
  PARTITIONS_CONSUMED_CONCURRENTLY,
  PORT,
  ENABLED,
  ROLLCALL_SERVICE_ROOT,
  ROLLCALL_INDEX_ENTITY,
  ROLLCALL_INDEX_SHARDPREFIX,
  ROLLCALL_INDEX_TYPE,
  ROLLCALL_ALIAS_NAME,
} from "config";
import applyStatusRepor from "./statusReport";
import logger from "logger";
import processProgram from "processProgram";

enum KnownEventSource {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
}
type AggregatedEvent = {
  programId: string;
  sources: Array<KnownEventSource>;
};
const createAggregatedEvent = ({
  sourceTopics,
  programId,
}: {
  sourceTopics: string[];
  programId: string;
}): ProducerRecord => {
  return {
    topic: PROGRAM_QUEUE_TOPIC,
    messages: [
      {
        key: programId,
        value: JSON.stringify({
          programId,
          sources: sourceTopics
            .map(
              (topic) =>
                ({
                  [CLINICAL_PROGRAM_UPDATE_TOPIC]: KnownEventSource.CLINICAL,
                }[topic])
            )
            .filter(Boolean),
        } as AggregatedEvent),
      },
    ],
  };
};

(async () => {
  /**
   * Express app to host status reports and other interface for interacting with this app
   */
  const expressApp = express();
  const statusReporter = applyStatusRepor(expressApp)("/status");
  expressApp.use(
    "/",
    swaggerUi.serve,
    swaggerUi.setup(yaml.load(path.join(__dirname, "./assets/swagger.yaml")))
  );

  await connectMongo();
  const esClient = await createEsClient();

  const rollCallClient = createRollCallClient({
    url: ROLLCALL_SERVICE_ROOT,
    aliasName: ROLLCALL_ALIAS_NAME,
    entity: ROLLCALL_INDEX_ENTITY,
    type: ROLLCALL_INDEX_TYPE,
    shardPrefix: ROLLCALL_INDEX_SHARDPREFIX,
  });

  const kafka = new Kafka({
    clientId: `donor-submission-aggregator`,
    brokers: KAFKA_BROKERS,
  });
  const consumer = kafka.consumer({
    groupId: KAFKA_CONSUMER_GROUP,
  });
  const producer = kafka.producer();

  expressApp.listen(7000, () => {
    logger.info(`Start readiness check at :${PORT}/status`);
  });

  /**
   * The main Kafka subscription
   */
  if (ENABLED) {
    await consumer.subscribe({
      topic: CLINICAL_PROGRAM_UPDATE_TOPIC,
    });
    await consumer.subscribe({
      topic: PROGRAM_QUEUE_TOPIC,
    });
    await consumer.run({
      partitionsConsumedConcurrently: PARTITIONS_CONSUMED_CONCURRENTLY,
      eachMessage: async ({ topic, message }) => {
        if (topic === CLINICAL_PROGRAM_UPDATE_TOPIC) {
          const { programId } = toClinicalProgramUpdateEvent(
            message.value.toString()
          );
          await producer.send(
            createAggregatedEvent({
              sourceTopics: [CLINICAL_PROGRAM_UPDATE_TOPIC],
              programId,
            })
          );
        }
        if (topic === PROGRAM_QUEUE_TOPIC) {
          const { programId } = toClinicalProgramUpdateEvent(
            message.value.toString()
          );
          await processProgram({
            programId,
            esClient,
            statusReporter,
            rollCallClient,
          });
        }
      },
    });
  }
  statusReporter.setReady(true);
})();
