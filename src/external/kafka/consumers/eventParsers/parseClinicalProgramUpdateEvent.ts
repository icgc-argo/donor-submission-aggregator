import logger from "logger";

type ClinicalProgramUpdateEvent = {
  programId: string;
};

const isProgramUpdateEvent = (
  data: unknown
): data is ClinicalProgramUpdateEvent => {
  if (typeof data === "object") {
    if (data) {
      return (
        data && typeof (data as { programId: string })["programId"] === "string"
      );
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
