export enum KnownEventSource {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
}

export type QueueRecord = { programId: string } & (
  | {
      type: KnownEventType.CLINICAL;
    }
  | {
      type: KnownEventType.RDPC | KnownEventType.SYNC;
      rdpcGatewayUrls: Array<string>;
    }
);

export enum KnownEventType {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
  SYNC = "SNC",
}
export type ProgramQueueProcessor = {
  knownEventType: {
    CLINICAL: KnownEventType.CLINICAL;
    RDPC: KnownEventType.RDPC;
    SYNC: KnownEventType.SYNC;
  };
  enqueueEvent: (event: QueueRecord) => Promise<void>;
  destroy: () => Promise<void>;
};
