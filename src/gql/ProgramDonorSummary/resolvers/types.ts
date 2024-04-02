/*
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Types from graphql
 */
export enum DonorMolecularDataReleaseStatus {
  FULLY_RELEASED = "FULLY_RELEASED",
  PARTIALLY_RELEASED = "PARTIALLY_RELEASED",
  NO_RELEASE = "NO_RELEASE",
}

export enum DonorMolecularDataProcessingStatus {
  COMPLETE = "COMPLETE",
  PROCESSING = "PROCESSING",
  REGISTERED = "REGISTERED",
}

export type DonorSummary = {
  entries: DonorSummaryEntry[];
  stats: ProgramDonorSummaryStats;
};

export type DonorSummaryEntry = {
  id: string;
  donorId: string;
  validWithCurrentDictionary: boolean;
  releaseStatus: DonorMolecularDataReleaseStatus;
  submitterDonorId: string;
  programShortName: string;
  submittedCoreDataPercent: number;
  submittedExtendedDataPercent: number;

  rnaRegisteredNormalSamples: number;
  rnaRegisteredTumourSamples: number;
  rnaPublishedNormalAnalysis: number;
  rnaPublishedTumourAnalysis: number;
  rnaAlignmentsCompleted: number;
  rnaAlignmentFailed: number;
  rnaAlignmentsRunning: number;

  matchedTNPairsDNA: number;
  registeredNormalSamples: number;
  registeredTumourSamples: number;
  publishedNormalAnalysis: number;
  publishedTumourAnalysis: number;
  alignmentsCompleted: number;
  alignmentsRunning: number;
  alignmentsFailed: number;
  sangerVcsCompleted: number;
  sangerVcsRunning: number;
  sangerVcsFailed: number;
  mutectCompleted: number;
  mutectRunning: number;
  mutectFailed: number;
  openAccessCompleted: number;
  openAccessRunning: number;
  openAccessFailed: number;
  processingStatus: DonorMolecularDataProcessingStatus;
  updatedAt: Date;
  createdAt: Date;
};

type ProgramDonorSummaryEntryField = keyof DonorSummaryEntry &
  keyof {
    combinedDonorId: string;
    coreDataPercentAggregation: string;
    registeredSamplePairs: string;
    dnaTNRegistered: string;
    dnaTNMatchedPair: string;
    rnaRegisteredSample: string;
    rnaRawReads: string;
    rnaAlignmentStatus: string;
    rawReads: string;
    alignmentStatus: string;
    sangerVCStatus: string;
    mutectStatus: string;
    openAccessStatus: string;
  };

export type ProgramDonorSummaryFilter = {
  field: ProgramDonorSummaryEntryField;
  values: string[];
};

export type ProgramDonorSummaryStats = {
  registeredDonorsCount: number;
  percentageCoreClinical: number;
  percentageTumourAndNormal: number;
  donorsProcessingMolecularDataCount: number;
  filesToQcCount: number;
  donorsWithReleasedFilesCount: number;
  allFilesCount: number;
  fullyReleasedDonorsCount: number;
  partiallyReleasedDonorsCount: number;
  noReleaseDonorsCount: number;
  donorsInvalidWithCurrentDictionaryCount: number;
  completedWorkflowRuns: number;
  inProgressWorkflowRuns: number;
  failedWorkflowRuns: number;

  coreCompletion: CoreCompletionStatusCount;

  dnaTNRegisteredStatus: TumorNormalStatusCount;

  dnaTNMatchedPairStatus: TumorNormalMatchedPairStatusCount;

  rnaSampleStatus: DataSubmissionStatus;

  rnaRawReadStatus: DataSubmissionStatus;

  rnaAlignmentStatusCount: WorkflowStatusCount;

  sampleStatus: SamplePairsStatusCount;

  rawReadsStatus: SamplePairsStatusCount;

  alignmentStatusCount: WorkflowStatusCount;

  sangerStatusCount: WorkflowStatusCount;

  mutectStatusCount: WorkflowStatusCount;

  openAccessStatusCount: WorkflowStatusCount;

  lastUpdate?: Date;
};

type CoreCompletionStatusCount = {
  completed: number;
  incomplete: number;
  noData: number;
};

type TumorNormalStatusCount = {
  tumorAndNormal: number;
  tumorOrNormal: number;
  noData: number;
};

type TumorNormalMatchedPairStatusCount = {
  tumorNormalMatchedPair: number;
  tumorNormalNoMatchedPair: number;
  tumorNormalMatchedPairMissingRawReads: number;
  noData: number;
};

type SamplePairsStatusCount = {
  valid: number;
  invalid: number;
};

type DataSubmissionStatus = {
  dataSubmitted: number;
  noDataSubmitted: number;
};

type WorkflowStatusCount = {
  noData: number;
  completed: number;
  inProgress: number;
  failed: number;
};

export type ProgramDonorSummaryStatsGqlResponse = ProgramDonorSummaryStats & {
  id: string;
  programShortName: string;
};

export type SortOrder = "asc" | "desc";

export type DonorSummaryEntrySort = {
  field: keyof ElasticsearchDonorDocument;
  order: SortOrder;
};
export type BaseQueryArguments = {
  rdpcCode: string;
  programShortName: string;
};

/**
 * Types from Elasticsearch
 */
export enum EsDonorDocumentField {
  alignmentsCompleted = "alignmentsCompleted",
  alignmentsFailed = "alignmentsFailed",
  alignmentsRunning = "alignmentsRunning",
  createdAt = "createdAt",
  donorId = "donorId",
  combinedDonorId = "combinedDonorId",
  coreDataPercentAggregation = "coreDataPercentAggregation",
  registeredSamplePairs = "registeredSamplePairs",
  dnaTNRegistered = "dnaTNRegistered",
  dnaTNMatchedPair = "dnaTNMatchedPair",
  rnaRegisteredSample = "rnaRegisteredSample",
  rnaRawReads = "rnaRawReads",
  rnaAlignmentStatus = "rnaAlignmentStatus",
  rawReads = "rawReads",
  alignmentStatus = "alignmentStatus",
  sangerVCStatus = "sangerVCStatus",
  mutectStatus = "mutectStatus",
  openAccessStatus = "openAccessStatus",
  processingStatus = "processingStatus",
  programId = "programId",

  rnaRegisteredNormalSamples = "rnaRegisteredNormalSamples",
  rnaRegisteredTumourSamples = "rnaRegisteredTumourSamples",
  rnaPublishedNormalAnalysis = "rnaPublishedNormalAnalysis",
  rnaPublishedTumourAnalysis = "rnaPublishedTumourAnalysis",
  rnaAlignmentsCompleted = "rnaAlignmentsCompleted",
  rnaAlignmentFailed = "rnaAlignmentFailed",
  rnaAlignmentsRunning = "rnaAlignmentsRunning",

  matchedTNPairsDNA = "matchedTNPairsDNA",
  publishedNormalAnalysis = "publishedNormalAnalysis",
  publishedTumourAnalysis = "publishedTumourAnalysis",
  registeredNormalSamples = "registeredNormalSamples",
  registeredTumourSamples = "registeredTumourSamples",
  releaseStatus = "releaseStatus",
  sangerVcsCompleted = "sangerVcsCompleted",
  sangerVcsFailed = "sangerVcsFailed",
  sangerVcsRunning = "sangerVcsRunning",
  mutectCompleted = "mutectCompleted",
  mutectRunning = "mutectRunning",
  mutectFailed = "mutectFailed",
  openAccessCompleted = "openAccessCompleted",
  openAccessRunning = "openAccessRunning",
  openAccessFailed = "openAccessFailed",
  submittedCoreDataPercent = "submittedCoreDataPercent",
  submittedExtendedDataPercent = "submittedExtendedDataPercent",
  submitterDonorId = "submitterDonorId",
  updatedAt = "updatedAt",
  validWithCurrentDictionary = "validWithCurrentDictionary",
  totalFilesCount = "totalFilesCount",
  filesToQcCount = "filesToQcCount",
}

export type ElasticsearchDonorDocument = {
  [EsDonorDocumentField.alignmentsCompleted]: number;
  [EsDonorDocumentField.alignmentsFailed]: number;
  [EsDonorDocumentField.alignmentsRunning]: number;
  [EsDonorDocumentField.createdAt]: string;
  [EsDonorDocumentField.donorId]: string;
  [EsDonorDocumentField.processingStatus]:
    | DonorMolecularDataProcessingStatus
    | "";
  [EsDonorDocumentField.programId]: string;

  [EsDonorDocumentField.rnaRegisteredNormalSamples]: number;
  [EsDonorDocumentField.rnaRegisteredTumourSamples]: number;
  [EsDonorDocumentField.rnaPublishedNormalAnalysis]: number;
  [EsDonorDocumentField.rnaPublishedTumourAnalysis]: number;
  [EsDonorDocumentField.rnaAlignmentsCompleted]: number;
  [EsDonorDocumentField.rnaAlignmentsRunning]: number;
  [EsDonorDocumentField.rnaAlignmentFailed]: number;

  [EsDonorDocumentField.matchedTNPairsDNA]: number;
  [EsDonorDocumentField.publishedNormalAnalysis]: number;
  [EsDonorDocumentField.publishedTumourAnalysis]: number;
  [EsDonorDocumentField.registeredNormalSamples]: number;
  [EsDonorDocumentField.registeredTumourSamples]: number;
  [EsDonorDocumentField.releaseStatus]: DonorMolecularDataReleaseStatus | "";
  [EsDonorDocumentField.sangerVcsCompleted]: number;
  [EsDonorDocumentField.sangerVcsFailed]: number;
  [EsDonorDocumentField.sangerVcsRunning]: number;
  [EsDonorDocumentField.mutectCompleted]: number;
  [EsDonorDocumentField.mutectRunning]: number;
  [EsDonorDocumentField.mutectFailed]: number;
  [EsDonorDocumentField.openAccessCompleted]: number;
  [EsDonorDocumentField.openAccessRunning]: number;
  [EsDonorDocumentField.openAccessFailed]: number;
  [EsDonorDocumentField.submittedCoreDataPercent]: number;
  [EsDonorDocumentField.submittedExtendedDataPercent]: number;
  [EsDonorDocumentField.submitterDonorId]: string;
  [EsDonorDocumentField.updatedAt]: string;
  [EsDonorDocumentField.validWithCurrentDictionary]: boolean;
  [EsDonorDocumentField.totalFilesCount]: number;
  [EsDonorDocumentField.filesToQcCount]: number;
};

export enum coreDataPercentAggregationValue {
  INCOMPLETE = "INCOMPLETE",
  COMPLETE = "COMPLETE",
  NO_DATA = "NO_DATA",
}

export enum registeredSamplePairsValue {
  VALID = "VALID",
  INVALID = "INVALID",
}

export enum RnaFilterStatus {
  DATA_SUBMITTED = "DATA_SUBMITTED",
  NO_DATA = "NO_DATA",
}

export enum rawReadsValue {
  VALID = "VALID",
  INVALID = "INVALID",
}

export enum workflowStatus {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_PROGRESS",
  NO_DATA = "NO_DATA",
}

export enum tumorNormalStatus {
  TUMOR_AND_NORMAL = "TUMOR_AND_NORMAL",
  TUMOR_OR_NORMAL = "TUMOR_OR_NORMAL",
  NO_DATA = "NO_DATA",
}

export enum tumorNormalMatchedPairStatus {
  TUMOR_NORMAL_MATCHED_PAIR = "TUMOR_NORMAL_MATCHED_PAIR",
  TUMOR_NORMAL_NO_MATCHED_PAIR = "TUMOR_NORMAL_NO_MATCHED_PAIR",
  TUMOR_NORMAL_MATCHED_PAIR_MISSING_RAW_READS = "TUMOR_NORMAL_MATCHED_PAIR_MISSING_RAW_READS",
  NO_DATA = "NO_DATA",
}

export enum validWithCurrentDictionaryStatus {
  VALID = "VALID",
  INVALID = "INVALID",
}
