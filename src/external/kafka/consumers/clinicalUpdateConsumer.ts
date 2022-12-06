import { KafkaMessage } from "kafkajs";
import createConsumer from "../createConsumer";
import { queueProgramUpdateEvent } from "../producers/programQueueProducer";
import { kafkaConfig, DEFAULT_HEARTBEAT_INTERVAL } from "config";
import parseClinicalProgramUpdateEvent from "external/kafka/consumers/eventParsers/parseClinicalProgramUpdateEvent";
import { isNotEmptyString } from "utils";
import { KnownEventType } from "processors/types";
import logger from "logger";

/**
 * Clinical Update Event Consumer
 * Whenever clinical service notifies that new clinical data has been submitted for a program, we queue a FILE_RELEASE event in the programQueue
 */
const consumer = createConsumer(
  kafkaConfig.consumers.clinicalUpdates,
  queueClinicalUpdateEvent
);

async function queueClinicalUpdateEvent(
  message: KafkaMessage,
  heartbeat: () => Promise<void>,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const stringMessage = message.value?.toString() || "";
  const { programId } = parseClinicalProgramUpdateEvent(
    message.value?.toString() || ""
  );
  if (isNotEmptyString(programId)) {
    const heartbeatInterval = setInterval(
      async () => await heartbeat(),
      kafkaConfig.consumers.clinicalUpdates.heartbeatInterval ||
        DEFAULT_HEARTBEAT_INTERVAL
    );

    try {
      await queueProgramUpdateEvent({
        programId,
        type: KnownEventType.CLINICAL,
      });
    } catch (err) {
      logger.error(
        `Failed to process clinical update event: ${message.key?.toString()} ${message.value?.toString()}`,
        err
      );
    } finally {
      clearInterval(heartbeatInterval);
    }
  } else {
    await sendDlqMessage(stringMessage);
  }
}

export default consumer;
