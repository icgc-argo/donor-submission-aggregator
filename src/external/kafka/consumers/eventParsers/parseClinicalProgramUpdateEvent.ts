import logger from "logger";
import { isNotAbsent } from "utils";

type ClinicalProgramUpdateEvent = {
  programId: string;
  donorSubmitterId?: string;
};

const isProgramUpdateEvent = (
  data: unknown
): data is ClinicalProgramUpdateEvent => {
  if (data && typeof data === "object") {
    const event = data as ClinicalProgramUpdateEvent;

    if (isNotAbsent(event.programId) && typeof event.programId === "string") {
      return true;
    }
    return false;
  }
  return false;
};

const parseClinicalProgramUpdateEvent = (
  str: string
): ClinicalProgramUpdateEvent => {
  const obj = JSON.parse(str);
  if (isProgramUpdateEvent(obj)) {
    return obj;
  } else {
    logger.warn(
      "Failed to process message, missing programId, it's either not a CLINICAL update event or message has invalid/missing fields."
    );
    return { programId: "" };
  }
};

export default parseClinicalProgramUpdateEvent;
