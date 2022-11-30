import { kafkaConfig } from "config";
import { KafkaMessage } from "kafkajs";
import processProgramQueueEvent from "processors/processProgramQueue";
import createConsumer from "../createConsumer";
import logger from "logger";

/**
 * Receive events from the program queue and initiate the appropriate process for that event.
 */
const consumer = createConsumer(
  kafkaConfig.consumers.programQueue,
  messageHandler
);

async function messageHandler(
  message: KafkaMessage,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  new Promise(async () => {
    try {
      consumer.consumer?.pause([{ topic: consumer.config.topic }]);
      await processProgramQueueEvent(message, sendDlqMessage);
    } catch (err) {
      logger.error(
        `Failed to process program queue message: ${message.key?.toString()} ${message.value?.toString()}`,
        err
      );
    } finally {
      consumer.consumer?.resume([{ topic: consumer.config.topic }]);
    }
  });
}

export default consumer;
