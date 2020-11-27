import { ApiResponse } from "@elastic/elasticsearch";

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
  knownEventTypes: {
    CLINICAL: KnownEventType.CLINICAL;
    RDPC: KnownEventType.RDPC;
    SYNC: KnownEventType.SYNC;
  };
  enqueueEvent: (event: QueueRecord) => Promise<void>;
  destroy: () => Promise<void>;
};

export type AliasResponse = ApiResponse<{
  [indexName: string]: {
    aliases: {
      [aliasName: string]: {};
    };
  };
}>;

export type SettingsResponse = ApiResponse<{
  [indexName: string]: {
    settings: {
      index: {
        number_of_shards: string;
        number_of_replicas: string;
      };
    };
  };
}>;
