import logger from "logger";
import { isNotAbsent } from "utils";

const parseFilePublicReleaseEvent = (
  message: string
): FilePublicReleaseEvent => {
  const obj = JSON.parse(message);
  if (isFilePublicReleaseEvent(obj)) {
    return obj;
  } else {
    logger.warn(
      "Failed to process message. Message must have a file release id and label."
    );
    return {
      id: "",
      publishedAt: "",
      label: "",
      programs: [],
    };
  }
};

const isFilePublicReleaseEvent = (
  data: unknown
): data is FilePublicReleaseEvent => {
  if (typeof data === "object" && data) {
    const event = data as FilePublicReleaseEvent;
    if (
      isNotAbsent(event.id) &&
      isNotAbsent(event.label) &&
      event.programs !== null &&
      event.programs !== undefined
    ) {
      return true;
    }
  }
  return false;
};

type FilePublicReleaseEvent = {
  id: string;
  publishedAt: string;
  label: string;
  programs: Program[];
};

export type Program = {
  id: string;
  donorsUpdated: string[];
};

export default parseFilePublicReleaseEvent;
