import { FEATURE_RDPC_INDEXING_ENABLED, kafkaConfig, RDPC_URL } from "config";
import { KafkaMessage } from "kafkajs";
import { KnownEventType } from "processors/types";
import { isNotEmptyString } from "utils";
import createConsumer from "../createConsumer";
import { queueProgramUpdateEvent } from "../producers/programQueueProducer";
import parseRdpcProgramUpdateEvent from "./eventParsers/parseRdpcProgramUpdateEvent";

/**
 * RDPC Analysis Update Event Consumer
 * Whenever an RDPC Song instance notifies that an analysis has been updated, we queue a RDPC event in the programQueue to update the associated donors
 */
const consumer = createConsumer(
  kafkaConfig.consumers.rdpcAnalysisUpdates,
  queueRdpcAnalysisUpdateEvent
);

async function queueRdpcAnalysisUpdateEvent(
  message: KafkaMessage,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const stringMessage = message.value?.toString() || "";
  if (FEATURE_RDPC_INDEXING_ENABLED) {
    const event = parseRdpcProgramUpdateEvent(stringMessage);
    if (isNotEmptyString(event.studyId)) {
      await queueProgramUpdateEvent({
        programId: event.studyId,
        type: KnownEventType.RDPC,
        rdpcGatewayUrls: [RDPC_URL], // TODO: These need to be read from data center registry based on the repository code in the analysis update event
        analysisId: event.analysisId,
      });
    } else {
      await sendDlqMessage(stringMessage);
    }
  }
}

export default consumer;
