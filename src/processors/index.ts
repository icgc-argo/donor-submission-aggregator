import { KafkaMessage } from "kafkajs";
import logger from "logger";
import processClinicalUpdateEvent from "./processClinical";
import processFileReleaseEvent from "./processFileRelease";
import processRdpcAnalysisUpdateEvent from "./processRdpcAnalysisUpdate";
import processSyncProgramEvent from "./processSync";
import { isQueueRecord, KnownEventType, QueueRecord } from "./types";

async function handleEventMessage(
  message: KafkaMessage,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const stringMessage = message.value?.toString() || "";
  try {
    //TODO: Write a proper event parser with validation
    const queuedEvent = JSON.parse(stringMessage);
    if (!isQueueRecord(queuedEvent)) {
      throw new Error("Event message was not of a known type");
    }
    logger.info(`Begin processing event: ${queuedEvent.type}`);
    switch (queuedEvent.type) {
      case KnownEventType.CLINICAL:
        processClinicalUpdateEvent(queuedEvent, sendDlqMessage);
        break;
      case KnownEventType.RDPC:
        processRdpcAnalysisUpdateEvent(queuedEvent, sendDlqMessage);
        break;
      case KnownEventType.SYNC:
        processSyncProgramEvent(queuedEvent, sendDlqMessage);
        break;
      case KnownEventType.FILE_RELEASE:
        processFileReleaseEvent(queuedEvent, sendDlqMessage);
        break;
    }
  } catch (err) {
    logger.error(`Failed to process queued event`, err);
    sendDlqMessage(stringMessage);
  }
}

export default handleEventMessage;
