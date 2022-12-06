import { kafkaConfig, DEFAULT_HEARTBEAT_INTERVAL } from "config";
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
  heartbeat: () => Promise<void>,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const heartbeatInterval = setInterval(
    async () => await heartbeat(),
    kafkaConfig.consumers.programQueue.heartbeatInterval ||
      DEFAULT_HEARTBEAT_INTERVAL
  );

  try {
    await processProgramQueueEvent(message, sendDlqMessage);
  } catch (err) {
    logger.error(
      `Failed to process program queue message: ${message.key?.toString()} ${message.value?.toString()}`,
      err
    );
  } finally {
    clearInterval(heartbeatInterval);
  }
}

export default consumer;
