import { FEATURE_INDEX_FILE_ENABLED, kafkaConfig } from "config";
import { KafkaMessage } from "kafkajs";
import { KnownEventType } from "programQueueProcessor/types";
import { isNotEmptyString } from "utils";
import createConsumer from "../createConsumer";
import { queueProgramUpdateEvent } from "../producers/programQueueProducer";
import parseFilePublicReleaseEvent from "./eventParsers/parseFilePublicReleaseEvent";

/**
 * File Public Release Consumer
 * Whenever file manager notifies that a public release has been completed, we queue a FILE_RELEASE event in the programQueue
 */
const consumer = createConsumer(
  kafkaConfig.consumers.filePublicReleases,
  queueFilePublicReleaseEvent
);

async function queueFilePublicReleaseEvent(message: KafkaMessage) {
  const stringMessage = message.value?.toString() || "";
  if (FEATURE_INDEX_FILE_ENABLED) {
    const event = parseFilePublicReleaseEvent(stringMessage);
    if (isNotEmptyString(event.id)) {
      await queueProgramUpdateEvent({
        type: KnownEventType.FILE_RELEASE,
        fileReleaseId: event.id,
        publishedAt: event.publishedAt,
        label: event.label,
        programs: event.programs,
      });
    } else {
      await consumer.sendDlqMessage(stringMessage);
    }
  }
}

export default consumer;
