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

enum RDPC_EVENT_STATE {
  PUBLISHED = "PUBLISHED",
  UNPUBLISHED = "UNPUBLISHED",
  SUPPRESSED = "SUPPRESSED",
}

type RdpcProgramUpdateEvent = {
  studyId: string;
  state: RDPC_EVENT_STATE;
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
