import { Program } from "eventParsers/parseFilePublicReleaseEvent";

export enum KnownEventType {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
  SYNC = "SYNC",
  FILE_RELEASE = "FILE_RELEASE",
}

type ProgramEventMessage = { programId?: string; requeued?: boolean };

type ClinicalUpdateEvent = ProgramEventMessage & {
  type: KnownEventType.CLINICAL;
};
type AnalysisUpdateEvent = ProgramEventMessage & {
  type: KnownEventType.RDPC;
  rdpcGatewayUrls: Array<string>;
  analysisId?: string;
};
type FileReleaseEvent = ProgramEventMessage & {
  type: KnownEventType.FILE_RELEASE;
  fileReleaseId: string;
  publishedAt: string;
  label: string;
  programs: Program[];
};
type SyncProgramEvent = ProgramEventMessage & {
  type: KnownEventType.SYNC;
  rdpcGatewayUrls: Array<string>;
};
export type QueueRecord =
  | ClinicalUpdateEvent
  | AnalysisUpdateEvent
  | FileReleaseEvent
  | SyncProgramEvent;

export type ProgramQueueProcessor = {
  knownEventTypes: {
    CLINICAL: KnownEventType.CLINICAL;
    RDPC: KnownEventType.RDPC;
    FILE: KnownEventType.FILE_RELEASE;
    SYNC: KnownEventType.SYNC;
  };
  enqueueEvent: (event: QueueRecord) => Promise<void>;
  sendDlqMessage: (dlqTopic: string, messageJSON: string) => Promise<void>;
  destroy: () => Promise<void>;
};
