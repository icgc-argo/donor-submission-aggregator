type ProgramUpdateEvent = {
  programId: string;
};

const isProgramUpdateEvent = (data: unknown): data is ProgramUpdateEvent => {
  if (typeof data === "object") {
    if (data) {
      return (
        data && typeof (data as { programId: string })["programId"] === "string"
      );
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const toProgramUpdateEvent = (str: string): ProgramUpdateEvent => {
  const obj = JSON.parse(str);
  if (isProgramUpdateEvent(obj)) {
    return obj;
  } else {
    throw new Error("Not a program update event");
  }
};

export default toProgramUpdateEvent;
