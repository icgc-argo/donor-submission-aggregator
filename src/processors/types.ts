import { Program } from "external/kafka/consumers/eventParsers/parseFilePublicReleaseEvent";

export enum KnownEventType {
  CLINICAL = "CLINICAL",
  RDPC = "RDPC",
  SYNC = "SYNC",
  FILE_RELEASE = "FILE_RELEASE",
}

export type ClinicalUpdateEvent = {
  type: KnownEventType.CLINICAL;
  programId: string;
};
export type AnalysisUpdateEvent = {
  type: KnownEventType.RDPC;
  programId: string;
  rdpcGatewayUrls: Array<string>;
  analysisId?: string;
};
export type FileReleaseEvent = {
  type: KnownEventType.FILE_RELEASE;
  fileReleaseId: string;
  publishedAt: string;
  label: string;
  programs: Program[];
};
export type SyncProgramEvent = {
  type: KnownEventType.SYNC;
  programId: string;
  rdpcGatewayUrls: Array<string>;
};
export type QueueRecord =
  | ClinicalUpdateEvent
  | AnalysisUpdateEvent
  | FileReleaseEvent
  | SyncProgramEvent;

/**
 * QueueRecord message structure validator
 * TODO: currently only checks for the common property `type`. A thorough solution would
 *  validate the structure of each type of event.
 * In the current form, mishappen messages could still get through but would likely just
 *  cause the processor to break and DLQ the message without harm.
 * @param input
 * @returns
 */
export const isQueueRecord = (input: any): input is QueueRecord => {
  return Object.values(KnownEventType).includes(input.type);
};
// export type ProgramQueueProcessor = {
//   knownEventTypes: {
//     CLINICAL: KnownEventType.CLINICAL;
//     RDPC: KnownEventType.RDPC;
//     FILE: KnownEventType.FILE_RELEASE;
//     SYNC: KnownEventType.SYNC;
//   };
//   enqueueEvent: (event: QueueRecord) => Promise<void>;
//   sendDlqMessage: (dlqTopic: string, messageJSON: string) => Promise<void>;
//   destroy: () => Promise<void>;
// };
