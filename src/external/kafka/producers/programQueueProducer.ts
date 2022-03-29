import { kafkaConfig, KafkaProducerConfiguration } from "config";
import { Kafka, Producer } from "kafkajs";
import logger from "logger";
import { QueueRecord as ProgramQueueRecord } from "processors/types";

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
    const result = await producer.send({
      topic: config.topic,
      messages: [
        {
          value: JSON.stringify(event),
        },
      ],
    });
    logger.info(
      `Queued ${event.type} event. Response: ${JSON.stringify(result)}`
    );
  }
};
