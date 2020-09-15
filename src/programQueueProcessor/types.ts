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
export type ProgramQueueEvent = {
  programId: string;
  changes: Array<QueuedProgramEventPayload>;
};

export type TestEventProcessedPayload = {
  queuedEvent: ProgramQueueEvent;
  targetIndex: ResolvedIndex;
};
export type ProgramQueueProcessor = {
  knownEventSource: {
    CLINICAL: KnownEventSource.CLINICAL;
    RDPC: KnownEventSource.RDPC;
  };
  enqueueEvent: (event: {
    changes: Array<QueuedProgramEventPayload>;
    programId: string;
  }) => Promise<void>;
  destroy: () => Promise<void>;
};
