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

const toProgramUpdateEvent = (str: string): ClinicalProgramUpdateEvent => {
  const obj = JSON.parse(str);
  if (isProgramUpdateEvent(obj)) {
    return obj;
  } else {
    throw new Error("Not a program update event");
  }
};

export default toProgramUpdateEvent;
