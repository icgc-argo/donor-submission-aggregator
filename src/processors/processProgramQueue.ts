import { KafkaMessage } from "kafkajs";
import logger from "logger";
import processClinicalUpdateEvent from "./processClinicalUpdate";
import processFileReleaseEvent from "./processFileRelease";
import processRdpcAnalysisUpdateEvent from "./processRdpcAnalysisUpdate";
import processSyncProgramEvent from "./processSync";
import { isQueueRecord, KnownEventType, QueueRecord } from "./types";

async function processProgramQueueEvent(
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
        await processClinicalUpdateEvent(queuedEvent, sendDlqMessage);
        break;
      case KnownEventType.RDPC:
        await processRdpcAnalysisUpdateEvent(queuedEvent, sendDlqMessage);
        break;
      case KnownEventType.SYNC:
        await processSyncProgramEvent(queuedEvent, sendDlqMessage);
        break;
      case KnownEventType.FILE_RELEASE:
        await processFileReleaseEvent(queuedEvent, sendDlqMessage);
        break;
    }
  } catch (err) {
    logger.error(`Failed to process queued event`, err);
    sendDlqMessage(stringMessage);
  }
}

export default processProgramQueueEvent;
