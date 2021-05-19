import logger from "logger";
import { Action } from "rdpc/query/types";
import { isNotAbsent } from "utils";

const parseRdpcProgramUpdateEvent = (
  message: string
): RdpcProgramUpdateEvent => {
  const obj = JSON.parse(message);
  if (isProgramUpdateEvent(obj)) {
    return obj;
  } else {
    logger.warn(
      "Failed to process message. Message must have studyId, and/or analysisId + action, it's either not a RDPC update event or message has invalid/missing fields."
    );
    return {
      studyId: "",
    };
  }
};

enum RDPC_EVENT_STATE {
  PUBLISHED = "PUBLISHED",
  UNPUBLISHED = "UNPUBLISHED",
  SUPPRESSED = "SUPPRESSED",
}

type RdpcProgramUpdateEvent = {
  studyId: string;
  state?: RDPC_EVENT_STATE;
  analysisId?: string;
  action?: Action;
};

const isProgramUpdateEvent = (
  data: unknown
): data is RdpcProgramUpdateEvent => {
  if (typeof data === "object" && data) {
    const event = data as RdpcProgramUpdateEvent;

    if (isNotAbsent(event.studyId) && typeof event.studyId === "string") {
      // analysisId and action are optional in the message,
      // when they are not present, only studyId is required for indexing the entire program,
      // when they are present, hey must both exist as they are needed
      // for fetchDonorIdsByAnalysis.
      if (
        (isNotAbsent(event.analysisId) && !isNotAbsent(event.action)) ||
        (!isNotAbsent(event.analysisId) && isNotAbsent(event.action))
      ) {
        return false;
      }
      return true;
    }
    return false;
  }
  return false;
};

export default parseRdpcProgramUpdateEvent;
