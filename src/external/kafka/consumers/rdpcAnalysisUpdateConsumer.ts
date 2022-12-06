import {
  featureFlags,
  kafkaConfig,
  RDPC_URL,
  DEFAULT_HEARTBEAT_INTERVAL,
} from "config";
import { KafkaMessage } from "kafkajs";
import { KnownEventType } from "processors/types";
import { isNotEmptyString } from "utils";
import createConsumer from "../createConsumer";
import { queueProgramUpdateEvent } from "../producers/programQueueProducer";
import parseRdpcProgramUpdateEvent from "./eventParsers/parseRdpcProgramUpdateEvent";
import logger from "logger";

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
  heartbeat: () => Promise<void>,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const stringMessage = message.value?.toString() || "";
  if (featureFlags.index.rdpc) {
    const event = parseRdpcProgramUpdateEvent(stringMessage);
    if (isNotEmptyString(event.studyId)) {
      const heartbeatInterval = setInterval(
        async () => await heartbeat(),
        kafkaConfig.consumers.clinicalUpdates.heartbeatInterval ||
          DEFAULT_HEARTBEAT_INTERVAL
      );

      try {
        await queueProgramUpdateEvent({
          programId: event.studyId,
          type: KnownEventType.RDPC,
          rdpcGatewayUrls: [RDPC_URL], // TODO: These need to be read from data center registry based on the repository code in the analysis update event
          analysisId: event.analysisId,
        });
      } catch (err) {
        logger.error(
          `Failed to process rdpc analysis update event: ${message.key?.toString()} ${message.value?.toString()}`,
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
