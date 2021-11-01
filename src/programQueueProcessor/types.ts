import { Program } from "eventParsers/parseFilePublicReleaseEvent";

export enum KnownEventSource {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
}

export type QueueRecord = { programId?: string; requeued?: boolean } & (
  | {
      type: KnownEventType.CLINICAL;
    }
  | {
      type: KnownEventType.RDPC;
      rdpcGatewayUrls: Array<string>;
      analysisId?: string;
    }
  | {
      type: KnownEventType.FILE;
      fileReleaseId: string;
      publishedAt: string;
      label: string;
      programs: Program[];
    }
  | {
      type: KnownEventType.SYNC;
      rdpcGatewayUrls: Array<string>;
    }
);

export enum KnownEventType {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
  SYNC = "SYNC",
  FILE = "FILE",
}

export type ProgramQueueProcessor = {
  knownEventTypes: {
    CLINICAL: KnownEventType.CLINICAL;
    RDPC: KnownEventType.RDPC;
    FILE: KnownEventType.FILE;
    SYNC: KnownEventType.SYNC;
  };
  enqueueEvent: (event: QueueRecord) => Promise<void>;
  sendDlqMessage: (dlqTopic: string, messageJSON: string) => Promise<void>;
  destroy: () => Promise<void>;
};
