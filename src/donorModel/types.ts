/**
 * This file was directly copied from argo-clinical:
 * https://github.com/icgc-argo/argo-clinical/blob/master/src/clinical/clinical-entities.ts
 */

export interface Donor {
  _id?: string;
  schemaMetadata: SchemaMetadata;
  donorId?: number;
  gender: string;
  submitterId: string;
  programId: string;
  specimens: Array<Specimen>;
  clinicalInfo?: ClinicalInfo;
  primaryDiagnosis?: ClinicalEntity | undefined;
  followUps?: Array<FollowUp>;
  treatments?: Array<Treatment>;
  createdAt?: string;
  updatedAt?: string;
  completenessStats?: CompeletenessStats;
}

export interface CompeletenessStats {
  coreCompletion: CoreCompletionStats;
  overriddenCoreCompletion: CoreClinicalEntites[];
}

export interface SchemaMetadata {
  lastMigrationId?: string | undefined | null;
  lastValidSchemaVersion: string;
  originalSchemaVersion: string;
  isValid: boolean;
}

export type ClinicalEntity = {
  clinicalInfo: ClinicalInfo;
  [k: string]: any;
};

export interface Specimen extends ClinicalEntity {
  samples: Array<Sample>;
  specimenTissueSource: string;
  submitterId: string;
  specimenId?: number;
  tumourNormalDesignation: string;
  specimenType: string;
}

export interface Sample {
  sampleId?: number;
  sampleType: string;
  submitterId: string;
}

export interface Treatment extends ClinicalEntity {
  therapies: Array<Therapy>;
}

export interface Therapy extends ClinicalEntity {
  therapyType: string;
}

export interface FollowUp extends ClinicalEntity {}

export interface ClinicalInfo {
  [field: string]: string | number | boolean | undefined;
}

export interface CoreCompletionStats {
  donor: number;
  specimens: number;
  primaryDiagnosis: number;
  followUps: number;
  treatments: number;
}

export type CoreClinicalEntites = keyof CoreCompletionStats;