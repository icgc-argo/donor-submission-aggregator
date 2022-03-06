import { kafkaConfig, KafkaProducerConfiguration } from "config";
import { Kafka, Producer } from "kafkajs";
import logger from "logger";
import { QueueRecord as ProgramQueueRecord } from "programQueueProcessor/types";

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
    const result = await producer.send({
      topic: config.topic,
      messages: [
        {
          key: event.programId,
          value: JSON.stringify(event),
        },
      ],
    });
    logger.debug(`Queuing event: ${JSON.stringify(event)}`);
    logger.info(
      `Queued ${event.type} event for program ${
        event.programId
      }. Response: ${JSON.stringify(result)}`
    );
  }
};
