import { ResolvedIndex } from "rollCall/types";

export enum KnownEventSource {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
}
export type QueuedClinicalEvent = {
  source: KnownEventSource.CLINICAL;
};
export type QueuedRdpcEvent = {
  source: KnownEventSource.RDPC;
  programId: string;
  analysisId: string;
  rdpcGatewayUrl: string;
};
export type QueuedProgramEventPayload = QueuedClinicalEvent | QueuedRdpcEvent;
export type QueueRecord = { programId: string } & (
  | {
      reason: KnownDataReason.CLINICAL;
    }
  | {
      reason: KnownDataReason.RDPC | KnownDataReason.SYNC;
      rdpcGatewayUrls: Array<string>;
    }
);

export enum KnownDataReason {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
  SYNC = "SNC",
}
export type ProgramQueueProcessor = {
  knownDataReason: {
    CLINICAL: KnownDataReason.CLINICAL;
    RDPC: KnownDataReason.RDPC;
    SYNC: KnownDataReason.SYNC;
  };
  enqueueEvent: (event: QueueRecord) => Promise<void>;
  destroy: () => Promise<void>;
};
