import { kafkaConfig } from "config";
import { KafkaMessage } from "kafkajs";
import handleEventMessage from "programQueueProcessor";
import createConsumer from "../createConsumer";

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
  return handleEventMessage(message, sendDlqMessage);
}

export default consumer;
