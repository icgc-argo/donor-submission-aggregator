import { kafkaConfig, KafkaProducerConfiguration } from "config";
import { Kafka, Producer } from "kafkajs";
import logger from "logger";
import {
  KnownEventType,
  QueueRecord as ProgramQueueRecord,
} from "processors/types";

let producer: Producer;
let config: KafkaProducerConfiguration;

export const init = async (kafka: Kafka) => {
  const producerConfig = kafkaConfig.producers.programQueue;

  producer = kafka.producer();
  await producer.connect();
  config = producerConfig;
};

export const disconnect = async () => {
  await producer?.disconnect();
};

export const queueProgramUpdateEvent = async (event: ProgramQueueRecord) => {
  if (producer) {
    logger.debug(`Queuing event: ${JSON.stringify(event)}`);

    const messages =
      event.type === KnownEventType.FILE_RELEASE
        ? event.programs.map((program) => ({
            value: JSON.stringify(event),
            key: program.id,
          }))
        : [{ value: JSON.stringify(event), key: event.programId }];

    const result = await producer.send({
      topic: config.topic,
      messages: messages,
    });

    logger.info(
      `Queued ${event.type} event. Response: ${JSON.stringify(result)}`
    );
  }
};
