import { kafkaConfig } from "config";
import { KafkaMessage } from "kafkajs";
import createConsumer from "../createConsumer";

/**
 * Receive events from the program queue and initiate the appropriate process for that event.
 */
const consumer = createConsumer(
  kafkaConfig.consumers.programQueue,
  handleEventMessage
);

async function handleEventMessage(message: KafkaMessage) {
  // TODO: initiate processing jobs based on kafka message
}
export default consumer;
