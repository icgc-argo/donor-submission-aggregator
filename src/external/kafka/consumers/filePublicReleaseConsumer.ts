import { featureFlags, kafkaConfig, DEFAULT_HEARTBEAT_INTERVAL } from "config";
import { KafkaMessage } from "kafkajs";
import { KnownEventType } from "processors/types";
import { isNotEmptyString } from "utils";
import createConsumer from "../createConsumer";
import { queueProgramUpdateEvent } from "../producers/programQueueProducer";
import parseFilePublicReleaseEvent from "./eventParsers/parseFilePublicReleaseEvent";
import logger from "logger";

/**
 * File Public Release Consumer
 * Whenever file manager notifies that a public release has been completed, we queue a FILE_RELEASE event in the programQueue
 */
const consumer = createConsumer(
  kafkaConfig.consumers.filePublicReleases,
  queueFilePublicReleaseEvent
);

async function queueFilePublicReleaseEvent(
  message: KafkaMessage,
  heartbeat: () => Promise<void>,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const stringMessage = message.value?.toString() || "";
  if (featureFlags.index.files) {
    const event = parseFilePublicReleaseEvent(stringMessage);
    if (isNotEmptyString(event.id)) {
      const heartbeatInterval = setInterval(
        async () => await heartbeat(),
        kafkaConfig.consumers.filePublicReleases.heartbeatInterval ||
          DEFAULT_HEARTBEAT_INTERVAL
      );

      try {
        await queueProgramUpdateEvent({
          type: KnownEventType.FILE_RELEASE,
          fileReleaseId: event.id,
          publishedAt: event.publishedAt,
          label: event.label,
          programs: event.programs,
        });
      } catch (err) {
        logger.error(
          `Failed to process file public release event: ${message.key?.toString()} ${message.value?.toString()}`,
          err
        );
      } finally {
        clearInterval(heartbeatInterval);
      }
    } else {
      await sendDlqMessage(stringMessage);
    }
  }
}

export default consumer;
