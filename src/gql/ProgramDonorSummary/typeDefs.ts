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

import gql from "graphql-tag";

export default gql`
  scalar DateTime

  enum DonorMolecularDataReleaseStatus {
    FULLY_RELEASED
    PARTIALLY_RELEASED
    NO_RELEASE
  }

  enum DonorMolecularDataProcessingStatus {
    COMPLETE
    PROCESSING
    REGISTERED
  }

  enum ProgramDonorSummaryEntryField {
    donorId
    """
    use this field to filter donor entries by partially matching donorId or submitterDonorId, e.g.: "donor", "donor5"
    """
    combinedDonorId
    """
    use this field to filter donor entries by 3 aggregations of submittedCoreDataPercent,
    3 enum options to filter by: NO_DATA, COMPLETE, INCOMPLETE.
    """
    coreDataPercentAggregation
    """
    use this field to filter donor entries by 2 enum values: VALID, INVALID.
    VALID means the donor has at least 1 registered tumour/normal sample pair.
    INVALID means the donor has not registered any tumour or normal samples.
    """
    registeredSamplePairs
    """
    use this field to filter donor entries by 2 enum values: VALID, INVALID.
    VALID means the donor has at least 1 submitted tumour/normal sequencing reads.
    INVALID means the donor has not registered any tumour or sequencing reads.
    """
    rawReads
    """
    use this field to filter donor entries by 4 enum values: COMPLETED, IN_PROGRESS, FAILED, NO_DATA.
    COMPLETED = donor has more than 1 completed alignment workflow;
    IN_PROGRESS = donor has more than 1 running alignment workflow;
    FAILED = donor has more than 1 failed alignment workflow;
    NO_DATA = donor has 0 of all the above alignment workflow.
    """
    alignmentStatus
    """
    use this field to filter donor entries by 4 enum values: COMPLETED, IN_PROGRESS, FAILED, NO_DATA.
    COMPLETED = donor has more than 1 completed sanger VC workflow;
    IN_PROGRESS = donor has more than 1 running sanger VC workflow;
    FAILED = donor has more than 1 failed sanger VC workflow;
    NO_DATA = donor has 0 of all the above sanger VC workflow.
    """
    sangerVCStatus
    """
    use this field to filter donor entries by 4 enum values: COMPLETED, IN_PROGRESS, FAILED, NO_DATA.
    COMPLETED = donor has more than 1 completed Mutect 2 workflow;
    IN_PROGRESS = donor has more than 1 running Mutect 2 workflow;
    FAILED = donor has more than 1 failed Mutect 2 workflow;
    NO_DATA = donor has 0 of all the above Mutect 2 workflow.
    """
    mutectStatus
    """
    use this field to filter donor entries by 4 enum values: COMPLETED, IN_PROGRESS, FAILED, NO_DATA.
    COMPLETED = donor has 1 or more completed Open Access workflow;
    IN_PROGRESS = donor has 1 or more running Open Access workflow;
    FAILED = donor has 1 or more failed Open Access workflow;
    NO_DATA = donor has 0 of all the above Open Access workflow.
    """
    openAccessStatus

    """
    use this field to filter donor entries by 3 enum values: TUMOR_AND_NORMAL, TUMOR_OR_NORMAL, NO_DATA.
    TUMOR_AND_NORMAL = donor has at least 1 registered tumour and 1 normal DNA sample.
    TUMOR_OR_NORMAL = donor has at least 1 registered tumour or 1 normal DNA sample, but not both.
    NO_DATA = donor has not registered any tumour or normal DNA samples.
    """
    dnaTNRegistered

    """
    use this field to filter donor entries by 4 enum values: TUMOR_NORMAL_MATCHED_PAIR, TUMOR_NORMAL_NO_MATCHED_PAIR, NO_DATA.
    TUMOR_NORMAL_MATCHED_PAIR = donor has at least 1 tumor/normal matched pair.
    TUMOR_NORMAL_NO_MATCHED_PAIR = donor has at least 1 registered tumour or 1 normal DNA sample, but no matched pairs.
    NO_DATA = donor has not registered any tumour or normal DNA samples.
    """
    dnaTNMatchedPair

    """
    use this field to filter donor entries by 2 enum values: DATA_SUBMITTED, NO_DATA.
    DATA_SUBMITTED means the donor has at least 1 registered tumour or 1 normal RNA sample.
    NO_DATA means the donor has not registered any tumour or normal RNA samples.
    """
    rnaRegisteredSample

    """
    use this field to filter donor entries by 2 enum values: DATA_SUBMITTED, NO_DATA.
    DATA_SUBMITTED means the donor has at least 1 published tumour or 1 published normal RNA raw reads.
    NO_DATA means the donor has no tumour and normal RNA raw reads.
    """
    rnaRawReads

    """
    use this field to filter donor entries by 4 enum values: COMPLETED, IN_PROGRESS, FAILED, NO_DATA.
    COMPLETED = donor has more than 1 completed RNA alignment workflow;
    IN_PROGRESS = donor has more than 1 running RNA alignment workflow;
    FAILED = donor has more than 1 failed RNA alignment workflow;
    NO_DATA = donor has 0 of all the above RNA alignment workflow.
    """
    rnaAlignmentStatus

    validWithCurrentDictionary
    releaseStatus
    submitterDonorId
    programShortName
    submittedCoreDataPercent
    submittedExtendedDataPercent

    rnaRegisteredNormalSamples
    rnaRegisteredTumourSamples
    rnaPublishedNormalAnalysis
    rnaPublishedTumourAnalysis
    rnaAlignmentsCompleted
    rnaAlignmentsRunning
    rnaAlignmentFailed

    matchedTNPairsDNA
    registeredNormalSamples
    registeredTumourSamples
    publishedNormalAnalysis
    publishedTumourAnalysis
    alignmentsCompleted
    alignmentsRunning
    alignmentsFailed
    sangerVcsCompleted
    sangerVcsRunning
    sangerVcsFailed
    mutectCompleted
    mutectRunning
    mutectFailed
    openAccessCompleted
    openAccessRunning
    openAccessFailed
    processingStatus
    updatedAt
    createdAt
  }

  input ProgramDonorSummaryFilter {
    field: ProgramDonorSummaryEntryField!
    values: [String!]!
  }

  enum SortOrder {
    asc
    desc
  }

  input DonorSummaryEntrySort {
    field: ProgramDonorSummaryEntryField!
    order: SortOrder
  }

  type DonorSummary {
    entries: [DonorSummaryEntry!]
    stats: ProgramDonorSummaryStats!
  }

  type WorkflowStatusCount {
    noData: Int!
    completed: Int!
    inProgress: Int!
    failed: Int!
  }

  type SamplePairsStatusCount {
    valid: Int!
    invalid: Int!
  }

  type DataSubmissionStatus {
    dataSubmitted: Int!
    noDataSubmitted: Int!
  }

  type CoreCompletionStatusCount {
    completed: Int!
    incomplete: Int!
    noData: Int!
  }

  type TumorNormalStatusCount {
    tumorAndNormal: Int!
    tumorOrNormal: Int!
    noData: Int!
  }

  type TumorNormalMatchedPairStatusCount {
    tumorNormalMatchedPair: Int!
    tumorNormalNoMatchedPair: Int!
    tumorNormalMatchedPairMissingRawReads: Int!
    noData: Int!
  }

  """
  Includes status summary of clinical and molecular data processing for the given donor
  """
  type DonorSummaryEntry {
    """
    Unique object ID for this summary object
    """
    id: ID!
    """
    Donor id of the donor within the program
    """
    donorId: String!
    """
    Short name of the program in which this donor is registered
    """
    programShortName: String!
    """
    Whether the donor submitted donor is valid according to the latest data dictionary layed out at: https://docs.icgc-argo.org/dictionary
    """
    validWithCurrentDictionary: Boolean!
    """
    Release status of the donor's molecular data
    """
    releaseStatus: DonorMolecularDataReleaseStatus!
    """

    """
    submitterDonorId: String!
    """
    Percentage of core clinical data fields that has been submitted for this donor. All core fields are listed at: https://docs.icgc-argo.org/dictionary
    """
    submittedCoreDataPercent: Float!
    """
    Percentage of extended clinical data fields that has been submitted for this donor. All extended fields are listed at: https://docs.icgc-argo.org/dictionary
    """
    submittedExtendedDataPercent: Float!
    """
    Number of normal RNA samples registered for this donor
    """
    rnaRegisteredNormalSamples: Int!
    """
    Number of tumour RNA samples registered for this donor
    """
    rnaRegisteredTumourSamples: Int!
    """
    Number of normal RNA sample analysis that has been published for this donor
    """
    rnaPublishedNormalAnalysis: Int!

    """
    Number of tumour RNA sample analysis that has been published for this donor
    """
    rnaPublishedTumourAnalysis: Int!
    """
    Number of RNA alignments completed for this donor
    """
    rnaAlignmentsCompleted: Int!
    """
    Number of RNA alignments currently running for this donor
    """
    rnaAlignmentsRunning: Int!
    """
    Number of RNA alignments that are failing for this donor
    """
    rnaAlignmentFailed: Int!
    """
    Number of matched normal/tumour DNA sample pairs registered for this donor
    """
    matchedTNPairsDNA: Int!
    """
    Number of normal DNA samples registered for this donor
    """
    registeredNormalSamples: Int!
    """
    Number of tumour DNA samples registered for this donor
    """
    registeredTumourSamples: Int!
    """
    Number of normal DNA sample analysis that has been published for this donor
    """
    publishedNormalAnalysis: Int!
    """
    Number of tumour DNA sample analysis that has been published for this donor
    """
    publishedTumourAnalysis: Int!
    """
    Number of DNA alignments completed for this donor
    """
    alignmentsCompleted: Int!
    """
    Number of DNA alignments currently running for this donor
    """
    alignmentsRunning: Int!
    """
    Number of DNA alignments that is failing for this donor
    """
    alignmentsFailed: Int!
    """
    Number of DNA Sanger VCs completed for this donor
    """
    sangerVcsCompleted: Int!
    """
    Number of DNA Sanger VCs currently running for this donor
    """
    sangerVcsRunning: Int!
    """
    Number of DNA Sanger VCs that is failing for this donor
    """
    sangerVcsFailed: Int!
    """
    Number of DNA Mutect2 completed for this donor
    """
    mutectCompleted: Int!
    """
    Number of DNA Mutect2 currently running for this donor
    """
    mutectRunning: Int!
    """
    Number of DNA Mutect2 that is failed for this donor
    """
    mutectFailed: Int!
    """
    Number of Open Access completed for this donor
    """
    openAccessCompleted: Int!
    """
    Number of DNA Open Access currently running for this donor
    """
    openAccessRunning: Int!
    """
    Number of DNA Open Access that is failed for this donor
    """
    openAccessFailed: Int!
    """
    Molecular data processing status of this donor
    """
    processingStatus: DonorMolecularDataProcessingStatus!
    """
    Timestamp of the latest update applied to this donor's clinical data
    """
    updatedAt: DateTime!
    """
    Timestamp of when this donor was first registered
    """
    createdAt: DateTime!
  }

  """
  Contains summary of aggregate clinical and molecular data processing status for the given program
  """
  type ProgramDonorSummaryStats {
    """
    Unique ID of this summary object
    """
    id: ID!
    """
    Short name of the program which this summary object is associated with
    """
    programShortName: String!
    """
    Total number of donors registered for this program
    """
    registeredDonorsCount: Int!
    """
    Percentage of core clinical data fields submitted over total core clinical data fields
    """
    percentageCoreClinical: Float!
    """
    Percentage of donors with at least 1 matched tumour/normal DNA raw reads pair
    """
    percentageTumourAndNormal: Float!
    """
    Number of donors whose molecular data is being processed
    """
    donorsProcessingMolecularDataCount: Int!
    """
    Number of files to QC
    """
    filesToQcCount: Int!
    """
    Number of donors whose files have been released
    """
    donorsWithReleasedFilesCount: Int!
    """
    Number of donors invalidated with current data dictionary version
    """
    donorsInvalidWithCurrentDictionaryCount: Int!
    """
    Total number of genomic files associated with this program
    """
    allFilesCount: Int!
    """
    Number of donors whose genomic files have been fully released
    """
    fullyReleasedDonorsCount: Int!
    """
    Number of donors who only have some genomic files that have been released
    """
    partiallyReleasedDonorsCount: Int!
    """
    Number of donors registered to the program who currently has no released genomic file
    """
    noReleaseDonorsCount: Int!

    """
    Number of donors that are clinically completed/incomplete/no core fields
    """
    coreCompletion: CoreCompletionStatusCount!

    """
    Number of donors that have tumor and normal data registered
    """
    dnaTNRegisteredStatus: TumorNormalStatusCount!
    """
    Number of donors that have tumor & normal matched pairs submitted
    """
    dnaTNMatchedPairStatus: TumorNormalMatchedPairStatusCount!
    """
    Number of donors that have submitted RNA samples
    """
    rnaSampleStatus: DataSubmissionStatus!
    """
    Number of donors that have submitted RNA published raw reads
    """
    rnaRawReadStatus: DataSubmissionStatus!
    """
    Number of donors that have COMPLETED/IN_PROGRESS/FAILED/NO_DATA as RNA alignment workflow status
    """
    rnaAlignmentStatusCount: WorkflowStatusCount!
    """
    Number of donors that have VALID/INVALID sample pairs
    """
    sampleStatus: SamplePairsStatusCount!

    """
    Number of donors that have VALID/INVALID raw reads
    """
    rawReadsStatus: SamplePairsStatusCount!

    """
    Number of donors that have COMPLETED/IN_PROGRESS/FAILED/NO_DATA as alignment workflow status
    """
    alignmentStatusCount: WorkflowStatusCount!

    """
    Number of donors that have COMPLETED/IN_PROGRESS/FAILED/NO_DATA as Sanger VC workflow status
    """
    sangerStatusCount: WorkflowStatusCount!

    """
    Number of donors that have COMPLETED/IN_PROGRESS/FAILED/NO_DATA as mutect2 workflow status
    """
    mutectStatusCount: WorkflowStatusCount!

    """
    Number of donors that have COMPLETED/IN_PROGRESS/FAILED/NO_DATA as Open Access workflow status
    """
    openAccessStatusCount: WorkflowStatusCount!

    """
    Date of the most recent update to the donor summary index for this program. Can be null if no documents for this program
    """
    lastUpdate: DateTime

    """
    Number of donors whose initiated workflows are all complete
    """
    completedWorkflowRuns: Int!

    """
    Number of donors with workflow runs that are currently running
    """
    inProgressWorkflowRuns: Int!

    """
    Number of donors with workflow runs that have failed
    """
    failedWorkflowRuns: Int!
  }

  type Query {
    """
    Paginated list of donor data summary given a program
    """
    programDonorSummary(
      programShortName: String!
      """
      Maximum page size of 500
      """
      first: Int = 20
      offset: Int = 0
      sorts: [DonorSummaryEntrySort] = [{ field: donorId, order: asc }]
      filters: [ProgramDonorSummaryFilter!] = []
    ): DonorSummary!
  }
`;
