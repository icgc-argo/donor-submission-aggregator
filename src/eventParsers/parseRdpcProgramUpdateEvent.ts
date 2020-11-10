const parseRdpcProgramUpdateEvent = (
  message: string
): RdpcProgramUpdateEvent => {
  const obj = JSON.parse(message);
  if (isProgramUpdateEvent(obj)) {
    return obj;
  } else {
    throw new Error("Not a program update event");
  }
};

type RdpcProgramUpdateEvent = {
  studyId: string;
  rdpcGatewayUrls: Array<string>;
};

const isProgramUpdateEvent = (
  data: unknown
): data is RdpcProgramUpdateEvent => {
  if (typeof data === "object") {
    if (data) {
      return (
        data && typeof (data as { studyId: string })["studyId"] === "string"
      );
    }
    return false;
  }
  return false;
};

export default parseRdpcProgramUpdateEvent;
