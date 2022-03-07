import { KafkaMessage } from "kafkajs";
import createConsumer from "../createConsumer";
import { queueProgramUpdateEvent } from "../producers/programQueueProducer";
import { kafkaConfig } from "config";
import parseClinicalProgramUpdateEvent from "external/kafka/consumers/eventParsers/parseClinicalProgramUpdateEvent";
import { KnownEventType } from "programQueueProcessor/types";
import { isNotEmptyString } from "utils";

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
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const stringMessage = message.value?.toString() || "";
  const { programId } = parseClinicalProgramUpdateEvent(
    message.value?.toString() || ""
  );
  if (isNotEmptyString(programId)) {
    await queueProgramUpdateEvent({
      programId,
      type: KnownEventType.CLINICAL,
    });
  } else {
    await sendDlqMessage(stringMessage);
  }
}

export default consumer;
