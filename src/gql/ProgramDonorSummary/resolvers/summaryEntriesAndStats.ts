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

import esb, { Query } from "elastic-builder";
import { GraphQLFieldResolver } from "graphql";
import {
  DonorSummaryEntry,
  ProgramDonorSummaryFilter,
  ElasticsearchDonorDocument,
  EsDonorDocumentField,
  DonorSummaryEntrySort,
  DonorMolecularDataProcessingStatus,
  DonorMolecularDataReleaseStatus,
  BaseQueryArguments,
  coreDataPercentAggregationValue,
  registeredSamplePairsValue,
  rawReadsValue,
  workflowStatus,
  DonorSummary,
  ProgramDonorSummaryStats,
  RnaFilterStatus,
  tumorNormalStatus,
  tumorNormalMatchedPairStatus,
  validWithCurrentDictionaryStatus,
} from "./types";
import { Client } from "@elastic/elasticsearch";
import {
  ELASTICSEARCH_PROGRAM_DONOR_DASHBOARD_INDEX,
  ENABLE_ELASTICSEARCH_LOGGING,
} from "config";
import { UserInputError } from "apollo-server-express";
import { GlobalGqlContext } from "gql/server";
import logger from "logger";

type DonorEntriesResolverType = GraphQLFieldResolver<
  unknown,
  GlobalGqlContext,
  BaseQueryArguments & {
    first: number;
    offset: number;
    sorts: DonorSummaryEntrySort[];
    filters: ProgramDonorSummaryFilter[];
  }
>;

const programDonorSummaryEntriesAndStatsResolver: (
  esClient: Client
) => DonorEntriesResolverType = (esClient) => async (
  source,
  args,
  context
): Promise<DonorSummary> => {
  const { programShortName } = args;

  const MAXIMUM_SUMMARY_PAGE_SIZE = 500;
  if (args.first > MAXIMUM_SUMMARY_PAGE_SIZE) {
    throw new UserInputError(
      `Max page size of ${MAXIMUM_SUMMARY_PAGE_SIZE} exceeded`,
      {
        first: args.first,
      }
    );
  }

  const queries: Query[] = [];
  queries.push(
    esb.termsQuery(EsDonorDocumentField.programId, programShortName)
  );

  /** This section builds es queries for API filters */
  args.filters.map((filter) => {
    const field = filter.field;

    if (
      field === EsDonorDocumentField.combinedDonorId &&
      filter.values.length > 0
    ) {
      // use wildcard query for donor_id and submitter_donor_id partial match
      const donorIdQueries: Query[] = [];
      for (const value of filter.values) {
        const regex = `*${value.toLowerCase()}*`;
        const wildcardQuery = esb.wildcardQuery(
          EsDonorDocumentField.combinedDonorId,
          regex
        );
        donorIdQueries.push(wildcardQuery);
      }
      const boolQuery = esb.boolQuery().should(donorIdQueries);
      queries.push(boolQuery);
    }

    if (
      field === EsDonorDocumentField.coreDataPercentAggregation &&
      filter.values.length > 0
    ) {
      const corePercentqueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case coreDataPercentAggregationValue.COMPLETE:
            corePercentqueries.push(
              esb.matchQuery(EsDonorDocumentField.submittedCoreDataPercent, "1")
            );
            break;
          case coreDataPercentAggregationValue.INCOMPLETE:
            corePercentqueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.submittedCoreDataPercent)
                .gt(0)
                .lt(1)
            );
            break;
          case coreDataPercentAggregationValue.NO_DATA:
            corePercentqueries.push(
              esb.matchQuery(EsDonorDocumentField.submittedCoreDataPercent, "0")
            );
            break;
          default:
            break;
        }
      }
      const boolQuery = esb.boolQuery().should(corePercentqueries);
      queries.push(boolQuery);
    }

    if (
      field === EsDonorDocumentField.registeredSamplePairs &&
      filter.values.length > 0
    ) {
      const sampleQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case registeredSamplePairsValue.INVALID:
            const shouldQueries: Query[] = [];
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.registeredNormalSamples)
                .lte(0)
            );
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.registeredTumourSamples)
                .lte(0)
            );
            sampleQueries.push(esb.boolQuery().should(shouldQueries));
            break;
          case registeredSamplePairsValue.VALID:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.registeredNormalSamples)
                .gte(1)
            );
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.registeredTumourSamples)
                .gte(1)
            );
            sampleQueries.push(esb.boolQuery().must(mustQueries));
            break;
        }
      }
      const boolQuery = esb.boolQuery().should(sampleQueries);
      queries.push(boolQuery);
    }

    if (field === EsDonorDocumentField.rawReads && filter.values.length > 0) {
      const rawReadsQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case rawReadsValue.INVALID:
            const shouldQueries: Query[] = [];
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.publishedNormalAnalysis)
                .lte(0)
            );
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.publishedTumourAnalysis)
                .lte(0)
            );
            rawReadsQueries.push(esb.boolQuery().should(shouldQueries));
            break;
          case rawReadsValue.VALID:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.publishedNormalAnalysis)
                .gte(1)
            );
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.publishedTumourAnalysis)
                .gte(1)
            );
            rawReadsQueries.push(esb.boolQuery().must(mustQueries));
            break;
        }
      }
      const boolQuery = esb.boolQuery().should(rawReadsQueries);
      queries.push(boolQuery);
    }

    if (
      field === EsDonorDocumentField.alignmentStatus &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case workflowStatus.COMPLETED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.alignmentsCompleted).gte(1)
            );
            break;
          case workflowStatus.IN_PROGRESS:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.alignmentsRunning).gte(1)
            );
            break;
          case workflowStatus.FAILED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.alignmentsFailed).gte(1)
            );
            break;
          case workflowStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.alignmentsCompleted).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.alignmentsRunning).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.alignmentsFailed).lte(0)
            );
            const noDataQuery = esb.boolQuery().must(mustQueries);
            shouldQueries.push(noDataQuery);
            break;
        }
      }
      const alignmentStatusQuery = esb.boolQuery().should(shouldQueries);
      queries.push(alignmentStatusQuery);
    }

    if (
      field === EsDonorDocumentField.sangerVCStatus &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case workflowStatus.COMPLETED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.sangerVcsCompleted).gte(1)
            );
            break;
          case workflowStatus.IN_PROGRESS:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.sangerVcsRunning).gte(1)
            );
            break;
          case workflowStatus.FAILED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.sangerVcsFailed).gte(1)
            );
            break;
          case workflowStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.sangerVcsRunning).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.sangerVcsCompleted).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.sangerVcsFailed).lte(0)
            );
            const noDataQuery = esb.boolQuery().must(mustQueries);
            shouldQueries.push(noDataQuery);
            break;
        }
      }
      const sangerVCStatusQuery = esb.boolQuery().should(shouldQueries);
      queries.push(sangerVCStatusQuery);
    }

    if (
      field === EsDonorDocumentField.mutectStatus &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case workflowStatus.COMPLETED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.mutectCompleted).gte(1)
            );
            break;
          case workflowStatus.IN_PROGRESS:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.mutectRunning).gte(1)
            );
            break;
          case workflowStatus.FAILED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.mutectFailed).gte(1)
            );
            break;
          case workflowStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.mutectCompleted).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.mutectRunning).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.mutectFailed).lte(0)
            );
            const noDataQuery = esb.boolQuery().must(mustQueries);
            shouldQueries.push(noDataQuery);
            break;
        }
      }
      const mutectStatusQuery = esb.boolQuery().should(shouldQueries);
      queries.push(mutectStatusQuery);
    }

    if (
      field === EsDonorDocumentField.openAccessStatus &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case workflowStatus.COMPLETED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.openAccessCompleted).gte(1)
            );
            break;
          case workflowStatus.IN_PROGRESS:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.openAccessRunning).gte(1)
            );
            break;
          case workflowStatus.FAILED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.openAccessFailed).gte(1)
            );
            break;
          case workflowStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.openAccessCompleted).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.openAccessRunning).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.openAccessFailed).lte(0)
            );
            const noDataQuery = esb.boolQuery().must(mustQueries);
            shouldQueries.push(noDataQuery);
            break;
        }
      }
      const openAccessStatusQuery = esb.boolQuery().should(shouldQueries);
      queries.push(openAccessStatusQuery);
    }

    if (
      field === EsDonorDocumentField.rnaRegisteredSample &&
      filter.values.length > 0
    ) {
      const sampleQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case RnaFilterStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaRegisteredNormalSamples)
                .lte(0)
            );
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaRegisteredTumourSamples)
                .lte(0)
            );
            sampleQueries.push(esb.boolQuery().must(mustQueries));
            break;
          case RnaFilterStatus.DATA_SUBMITTED:
            const shouldQueries: Query[] = [];
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaRegisteredNormalSamples)
                .gte(1)
            );
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaRegisteredTumourSamples)
                .gte(1)
            );
            sampleQueries.push(esb.boolQuery().should(shouldQueries));
            break;
        }
      }
      const boolQuery = esb.boolQuery().should(sampleQueries);
      queries.push(boolQuery);
    }

    if (
      field === EsDonorDocumentField.rnaRawReads &&
      filter.values.length > 0
    ) {
      const sampleQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case RnaFilterStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaPublishedNormalAnalysis)
                .lte(0)
            );
            mustQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaPublishedTumourAnalysis)
                .lte(0)
            );
            sampleQueries.push(esb.boolQuery().must(mustQueries));
            break;
          case RnaFilterStatus.DATA_SUBMITTED:
            const shouldQueries: Query[] = [];
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaPublishedNormalAnalysis)
                .gte(1)
            );
            shouldQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.rnaPublishedTumourAnalysis)
                .gte(1)
            );
            sampleQueries.push(esb.boolQuery().should(shouldQueries));
            break;
        }
      }
      const boolQuery = esb.boolQuery().should(sampleQueries);
      queries.push(boolQuery);
    }

    if (
      field === EsDonorDocumentField.rnaAlignmentStatus &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case workflowStatus.COMPLETED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.rnaAlignmentsCompleted).gte(1)
            );
            break;
          case workflowStatus.IN_PROGRESS:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.rnaAlignmentsRunning).gte(1)
            );
            break;
          case workflowStatus.FAILED:
            shouldQueries.push(
              esb.rangeQuery(EsDonorDocumentField.rnaAlignmentFailed).gte(1)
            );
            break;
          case workflowStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.rnaAlignmentsCompleted).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.rnaAlignmentsRunning).lte(0)
            );
            mustQueries.push(
              esb.rangeQuery(EsDonorDocumentField.rnaAlignmentFailed).lte(0)
            );
            const noDataQuery = esb.boolQuery().must(mustQueries);
            shouldQueries.push(noDataQuery);
            break;
        }
      }
      const alignmentStatusQuery = esb.boolQuery().should(shouldQueries);
      queries.push(alignmentStatusQuery);
    }

    if (
      field === EsDonorDocumentField.dnaTNRegistered &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case tumorNormalStatus.TUMOR_AND_NORMAL:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb
                .rangeQuery()
                .field(EsDonorDocumentField.registeredNormalSamples)
                .gte(1)
            );
            mustQueries.push(
              esb
                .rangeQuery()
                .field(EsDonorDocumentField.registeredTumourSamples)
                .gte(1)
            );
            const tumorNormalQuery = esb.boolQuery().must(mustQueries);
            shouldQueries.push(tumorNormalQuery);
            break;
          case tumorNormalStatus.TUMOR_OR_NORMAL:
            const mustNotQueries: Query[] = [];
            mustNotQueries.push(
              esb.boolQuery().must([
                // not both
                esb
                  .rangeQuery()
                  .field(EsDonorDocumentField.registeredNormalSamples)
                  .gte(1),
                esb
                  .rangeQuery()
                  .field(EsDonorDocumentField.registeredTumourSamples)
                  .gte(1),
              ])
            );
            mustNotQueries.push(
              esb.boolQuery().must([
                // not neither
                esb
                  .rangeQuery()
                  .field(EsDonorDocumentField.registeredNormalSamples)
                  .lte(0),
                esb
                  .rangeQuery()
                  .field(EsDonorDocumentField.registeredTumourSamples)
                  .lte(0),
              ])
            );
            const tumorOrNormalQuery = esb.boolQuery().mustNot(mustNotQueries);
            shouldQueries.push(tumorOrNormalQuery);
            break;
          case tumorNormalStatus.NO_DATA:
            const noDataQueries: Query[] = [];
            noDataQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.registeredTumourSamples)
                .lte(0)
            );
            noDataQueries.push(
              esb
                .rangeQuery(EsDonorDocumentField.registeredNormalSamples)
                .lte(0)
            );
            const noDataQuery = esb.boolQuery().must(noDataQueries);
            shouldQueries.push(noDataQuery);
            break;
        }
      }
      const dnaTNRegisteredQuery = esb.boolQuery().should(shouldQueries);
      queries.push(dnaTNRegisteredQuery);
    }

    if (
      field === EsDonorDocumentField.dnaTNMatchedPair &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        switch (value) {
          case tumorNormalMatchedPairStatus.TUMOR_NORMAL_MATCHED_PAIR:
            shouldQueries.push(
              esb
                .rangeQuery()
                .field(EsDonorDocumentField.matchedTNPairsDNA)
                .gte(1)
            );
            break;
          case tumorNormalMatchedPairStatus.TUMOR_NORMAL_NO_MATCHED_PAIR:
            shouldQueries.push(
              esb
                .rangeQuery()
                .field(EsDonorDocumentField.matchedTNPairsDNA)
                .lte(0)
            );
            break;
          case tumorNormalMatchedPairStatus.TUMOR_NORMAL_MATCHED_PAIR_MISSING_RAW_READS:
            shouldQueries.push(
              // donor has at least 1 DNA matched pair and either
              // fewer DNA normal raw reads than DNA normal registered samples
              // or fewer DNA tumour raw reads than DNA tumour registered samples
              esb
                .boolQuery()
                .must([
                  esb
                    .rangeQuery()
                    .field(EsDonorDocumentField.matchedTNPairsDNA)
                    .gte(1),
                  esb
                    .boolQuery()
                    .should([
                      esb.scriptQuery(
                        esb
                          .script()
                          .lang("painless")
                          .inline(
                            "doc['publishedNormalAnalysis'].value < doc['registeredNormalSamples'].value"
                          )
                      ),
                      esb.scriptQuery(
                        esb
                          .script()
                          .lang("painless")
                          .inline(
                            "doc['publishedTumourAnalysis'].value < doc['registeredTumourSamples'].value"
                          )
                      ),
                    ]),
                ])
            );
            break;
          case tumorNormalMatchedPairStatus.NO_DATA:
            const mustQueries: Query[] = [];
            mustQueries.push(
              esb
                .rangeQuery()
                .field(EsDonorDocumentField.matchedTNPairsDNA)
                .lte(0)
            );
            mustQueries.push(
              esb
                .rangeQuery()
                .field(EsDonorDocumentField.publishedNormalAnalysis)
                .lte(0)
            );
            mustQueries.push(
              esb
                .rangeQuery()
                .field(EsDonorDocumentField.publishedTumourAnalysis)
                .lte(0)
            );
            const noDataQuery = esb.boolQuery().must(mustQueries);
            shouldQueries.push(noDataQuery);
            break;
        }
      }
      const dnaTNMatchedPairQuery = esb.boolQuery().should(shouldQueries);
      queries.push(dnaTNMatchedPairQuery);
    }

    if (
      field === EsDonorDocumentField.validWithCurrentDictionary &&
      filter.values.length > 0
    ) {
      const shouldQueries: Query[] = [];
      for (const value of filter.values) {
        if (
          value === validWithCurrentDictionaryStatus.VALID ||
          value === validWithCurrentDictionaryStatus.INVALID
        ) {
          shouldQueries.push(
            esb.termsQuery(
              EsDonorDocumentField.validWithCurrentDictionary,
              value === validWithCurrentDictionaryStatus.VALID
            )
          );
        }
      }

      const validWithDictionaryQuery = esb.boolQuery().should(shouldQueries);

      queries.push(validWithDictionaryQuery);
    }
  });

  type AggregationName =
    | keyof ProgramDonorSummaryStats
    | "donorsInvalidWithCurrentDictionary";

  const filterAggregation = (
    name: AggregationName,
    filterQuery?: esb.Query | undefined
  ) => esb.filterAggregation(name, filterQuery);

  const esQuery = esb
    .requestBodySearch()
    .query(esb.boolQuery().must(queries))

    /** This section builds es aggregation queries for ProgramDonorSummaryStats,
     * these aggregations are later used for calculating dashboard stats. */
    .aggs([
      filterAggregation("fullyReleasedDonorsCount" as AggregationName).filter(
        esb
          .termsQuery()
          .field(EsDonorDocumentField.releaseStatus)
          .values([DonorMolecularDataReleaseStatus.FULLY_RELEASED])
      ),
      filterAggregation(
        "partiallyReleasedDonorsCount" as AggregationName
      ).filter(
        esb
          .termsQuery()
          .field(EsDonorDocumentField.releaseStatus)
          .values([DonorMolecularDataReleaseStatus.PARTIALLY_RELEASED])
      ),
      filterAggregation("noReleaseDonorsCount" as AggregationName).filter(
        esb
          .termsQuery()
          .field(EsDonorDocumentField.releaseStatus)
          .values([DonorMolecularDataReleaseStatus.NO_RELEASE, ""])
      ),
      filterAggregation(
        "donorsProcessingMolecularDataCount" as AggregationName
      ).filter(
        esb
          .termsQuery()
          .field(EsDonorDocumentField.processingStatus)
          .values([DonorMolecularDataProcessingStatus.PROCESSING])
      ),
      filterAggregation(
        "donorsWithReleasedFilesCount" as AggregationName
      ).filter(
        esb
          .termsQuery()
          .field(EsDonorDocumentField.releaseStatus)
          .values([
            DonorMolecularDataReleaseStatus.PARTIALLY_RELEASED,
            DonorMolecularDataReleaseStatus.FULLY_RELEASED,
          ])
      ),
      filterAggregation("donorsWithMatchedTNPair" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.matchedTNPairsDNA).gt(0)
      ),
      filterAggregation(
        "donorsInvalidWithCurrentDictionary" as AggregationName
      ).filter(
        esb
          .termQuery()
          .field(EsDonorDocumentField.validWithCurrentDictionary)
          .value(false)
      ),
      filterAggregation("completeCoreCompletion" as AggregationName).filter(
        esb
          .termQuery()
          .field(EsDonorDocumentField.submittedCoreDataPercent)
          .value(1)
      ),
      filterAggregation("incompleteCoreCompletion" as AggregationName).filter(
        esb
          .rangeQuery()
          .field(EsDonorDocumentField.submittedCoreDataPercent)
          .gt(0)
          .lt(1)
      ),
      filterAggregation("dnaTNRegisteredSamples" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredNormalSamples)
              .gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredTumourSamples)
              .gte(1),
          ])
      ),
      filterAggregation(
        "dnaOneOfTNRegisteredSamples" as AggregationName
      ).filter(
        // looking for tumor OR normal
        // one or the other, not both, not neither
        esb.boolQuery().mustNot([
          esb.boolQuery().must([
            // not both
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredNormalSamples)
              .gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredTumourSamples)
              .gte(1),
          ]),
          esb.boolQuery().must([
            esb
              // not neither
              .rangeQuery()
              .field(EsDonorDocumentField.registeredNormalSamples)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredTumourSamples)
              .lte(0),
          ]),
        ])
      ),
      filterAggregation("noDnaTNRegisteredSamples" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredNormalSamples)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredTumourSamples)
              .lte(0),
          ])
      ),
      filterAggregation("dnaTNMatchedPairsSubmitted" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.matchedTNPairsDNA).gte(1)
      ),
      filterAggregation(
        "noDnaTNMatchedPairsSubmitted" as AggregationName
      ).filter(
        // no matched pairs. overlaps with "no data"
        esb.rangeQuery().field(EsDonorDocumentField.matchedTNPairsDNA).lte(0)
      ),
      filterAggregation(
        "dnaTNMatchedPairsMissingRawReads" as AggregationName
      ).filter(
        // donor has at least 1 DNA matched pair and either
        // fewer DNA normal raw reads than DNA normal registered samples
        // or fewer DNA tumour raw reads than DNA tumour registered samples
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.matchedTNPairsDNA)
              .gte(1),
            esb
              .boolQuery()
              .should([
                esb.scriptQuery(
                  esb
                    .script()
                    .lang("painless")
                    .inline(
                      "doc['publishedNormalAnalysis'].value < doc['registeredNormalSamples'].value"
                    )
                ),
                esb.scriptQuery(
                  esb
                    .script()
                    .lang("painless")
                    .inline(
                      "doc['publishedTumourAnalysis'].value < doc['registeredTumourSamples'].value"
                    )
                ),
              ]),
          ])
      ),
      filterAggregation("noDnaTNMatchedPairsData" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.matchedTNPairsDNA)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.publishedNormalAnalysis)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.publishedTumourAnalysis)
              .lte(0),
          ])
      ),
      filterAggregation("noCoreCompletion" as AggregationName).filter(
        esb
          .termQuery()
          .field(EsDonorDocumentField.submittedCoreDataPercent)
          .value(0)
      ),
      filterAggregation("rnaRegisteredSamples" as AggregationName).filter(
        esb
          .boolQuery()
          .should([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaRegisteredNormalSamples)
              .gt(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaRegisteredTumourSamples)
              .gt(0),
          ])
      ),
      filterAggregation("noRnaRegisteredSamples" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaRegisteredNormalSamples)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaRegisteredTumourSamples)
              .lte(0),
          ])
      ),

      filterAggregation("rnaSubmittedRawReads" as AggregationName).filter(
        esb
          .boolQuery()
          .should([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaPublishedNormalAnalysis)
              .gt(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaPublishedTumourAnalysis)
              .gt(0),
          ])
      ),
      filterAggregation("noRnaSubmittedRawReads" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaPublishedNormalAnalysis)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaPublishedTumourAnalysis)
              .lte(0),
          ])
      ),
      filterAggregation("rnaCompletedAlignment" as AggregationName).filter(
        esb
          .rangeQuery()
          .field(EsDonorDocumentField.rnaAlignmentsCompleted)
          .gte(1)
      ),
      filterAggregation("rnaInProgressAlignment" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.rnaAlignmentsRunning).gte(1)
      ),
      filterAggregation("rnaFailedAlignment" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.rnaAlignmentFailed).gte(1)
      ),
      filterAggregation("rnaNoAlignment" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaAlignmentsCompleted)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaAlignmentsRunning)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.rnaAlignmentFailed)
              .lte(0),
          ])
      ),
      filterAggregation("validSamplePairs" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredNormalSamples)
              .gt(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredTumourSamples)
              .gt(0),
          ])
      ),
      filterAggregation("invalidSamplePairs" as AggregationName).filter(
        esb
          .boolQuery()
          .should([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredNormalSamples)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.registeredTumourSamples)
              .lte(0),
          ])
      ),
      filterAggregation("validRawReads" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.publishedNormalAnalysis)
              .gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.publishedTumourAnalysis)
              .gte(1),
          ])
      ),
      filterAggregation("invalidRawReads" as AggregationName).filter(
        esb
          .boolQuery()
          .should([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.publishedNormalAnalysis)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.publishedTumourAnalysis)
              .lte(0),
          ])
      ),
      filterAggregation("completedAlignment" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.alignmentsCompleted).gte(1)
      ),
      filterAggregation("inProgressAlignment" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.alignmentsRunning).gte(1)
      ),
      filterAggregation("failedAlignment" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.alignmentsFailed).gte(1)
      ),
      filterAggregation("noAlignment" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsCompleted)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsRunning)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsFailed)
              .lte(0),
          ])
      ),
      filterAggregation("completedSanger" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.sangerVcsCompleted).gte(1)
      ),
      filterAggregation("inProgressSanger" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.sangerVcsRunning).gte(1)
      ),
      filterAggregation("failedSanger" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.sangerVcsFailed).gte(1)
      ),
      filterAggregation("noSanger" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.sangerVcsCompleted)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.sangerVcsRunning)
              .lte(0),
            esb.rangeQuery().field(EsDonorDocumentField.sangerVcsFailed).lte(0),
          ])
      ),
      filterAggregation("completedMutect" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.mutectCompleted).gte(1)
      ),
      filterAggregation("inProgressMutect" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.mutectRunning).gte(1)
      ),
      filterAggregation("failedMutect" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.mutectFailed).gte(1)
      ),
      filterAggregation("noMutect" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb.rangeQuery().field(EsDonorDocumentField.mutectCompleted).lte(0),
            esb.rangeQuery().field(EsDonorDocumentField.mutectRunning).lte(0),
            esb.rangeQuery().field(EsDonorDocumentField.mutectFailed).lte(0),
          ])
      ),
      filterAggregation("completedOpenAccess" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.openAccessCompleted).gte(1)
      ),
      filterAggregation("inProgressOpenAccess" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.openAccessRunning).gte(1)
      ),
      filterAggregation("failedOpenAccess" as AggregationName).filter(
        esb.rangeQuery().field(EsDonorDocumentField.openAccessFailed).gte(1)
      ),
      filterAggregation("noOpenAccess" as AggregationName).filter(
        esb
          .boolQuery()
          .must([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessCompleted)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessRunning)
              .lte(0),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessFailed)
              .lte(0),
          ])
      ),
      // 'Completed' workflow runs => completed all workflows that have been initiated
      // i.e. can't have anything failed or in-progress, must have at least one completed
      filterAggregation("completedWorkflowRuns" as AggregationName).filter(
        esb
          .boolQuery()
          .should([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsCompleted)
              .gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.sangerVcsCompleted)
              .gte(1),
            esb.rangeQuery().field(EsDonorDocumentField.mutectCompleted).gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessCompleted)
              .gte(1),
          ])
          .mustNot([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsRunning)
              .gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.sangerVcsRunning)
              .gte(1),
            esb.rangeQuery().field(EsDonorDocumentField.mutectRunning).gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessRunning)
              .gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsFailed)
              .gte(1),
            esb.rangeQuery().field(EsDonorDocumentField.sangerVcsFailed).gte(1),
            esb.rangeQuery().field(EsDonorDocumentField.mutectFailed).gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessFailed)
              .gte(1),
          ])
      ),
      filterAggregation("inProgressWorkflowRuns" as AggregationName).filter(
        esb
          .boolQuery()
          .should([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsRunning)
              .gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.sangerVcsRunning)
              .gte(1),
            esb.rangeQuery().field(EsDonorDocumentField.mutectRunning).gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessRunning)
              .gte(1),
          ])
      ),
      filterAggregation("failedWorkflowRuns" as AggregationName).filter(
        esb
          .boolQuery()
          .should([
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.alignmentsFailed)
              .gte(1),
            esb.rangeQuery().field(EsDonorDocumentField.sangerVcsFailed).gte(1),
            esb.rangeQuery().field(EsDonorDocumentField.mutectFailed).gte(1),
            esb
              .rangeQuery()
              .field(EsDonorDocumentField.openAccessFailed)
              .gte(1),
          ])
      ),
      esb
        .sumAggregation("allFilesCount" as AggregationName)
        .field(EsDonorDocumentField.totalFilesCount),
      esb
        .sumAggregation("filesToQcCount" as AggregationName)
        .field(EsDonorDocumentField.filesToQcCount),
      esb
        .maxAggregation("lastUpdate" as AggregationName)
        .field(EsDonorDocumentField.updatedAt),
    ])
    .sorts(args.sorts.map(({ field, order }) => esb.sort(field, order)))
    .from(args.offset)
    .size(args.first);

  type EsHits = Array<{
    _source: ElasticsearchDonorDocument;
  }>;

  type FilterAggregationResult = { doc_count: number };
  type NumericAggregationResult = { value: number };
  type DateAggregationResult = { value: Date };

  type QueryResult = {
    hits: {
      total: { value: number; relation: string };
      hits: EsHits;
    };
    aggregations: {
      fullyReleasedDonorsCount: FilterAggregationResult;
      partiallyReleasedDonorsCount: FilterAggregationResult;
      noReleaseDonorsCount: FilterAggregationResult;
      donorsProcessingMolecularDataCount: FilterAggregationResult;
      donorsWithReleasedFilesCount: FilterAggregationResult;
      donorsWithMatchedTNPair: FilterAggregationResult;
      donorsInvalidWithCurrentDictionary: FilterAggregationResult;
      donorsWithPublishedNormalAndTumourSamples: FilterAggregationResult;

      completeCoreCompletion: FilterAggregationResult;
      incompleteCoreCompletion: FilterAggregationResult;
      noCoreCompletion: FilterAggregationResult;

      dnaTNRegisteredSamples: FilterAggregationResult;
      dnaOneOfTNRegisteredSamples: FilterAggregationResult;
      noDnaTNRegisteredSamples: FilterAggregationResult;

      dnaTNMatchedPairsSubmitted: FilterAggregationResult;
      noDnaTNMatchedPairsSubmitted: FilterAggregationResult;
      dnaTNMatchedPairsMissingRawReads: FilterAggregationResult;
      noDnaTNMatchedPairsData: FilterAggregationResult;

      rnaRegisteredSamples: FilterAggregationResult;
      noRnaRegisteredSamples: FilterAggregationResult;

      rnaSubmittedRawReads: FilterAggregationResult;
      noRnaSubmittedRawReads: FilterAggregationResult;

      rnaCompletedAlignment: FilterAggregationResult;
      rnaInProgressAlignment: FilterAggregationResult;
      rnaFailedAlignment: FilterAggregationResult;
      rnaNoAlignment: FilterAggregationResult;

      validSamplePairs: FilterAggregationResult;
      invalidSamplePairs: FilterAggregationResult;

      validRawReads: FilterAggregationResult;
      invalidRawReads: FilterAggregationResult;

      completedAlignment: FilterAggregationResult;
      inProgressAlignment: FilterAggregationResult;
      failedAlignment: FilterAggregationResult;
      noAlignment: FilterAggregationResult;

      completedSanger: FilterAggregationResult;
      inProgressSanger: FilterAggregationResult;
      failedSanger: FilterAggregationResult;
      noSanger: FilterAggregationResult;

      completedMutect: FilterAggregationResult;
      inProgressMutect: FilterAggregationResult;
      failedMutect: FilterAggregationResult;
      noMutect: FilterAggregationResult;

      completedOpenAccess: FilterAggregationResult;
      inProgressOpenAccess: FilterAggregationResult;
      failedOpenAccess: FilterAggregationResult;
      noOpenAccess: FilterAggregationResult;

      completedWorkflowRuns: FilterAggregationResult;
      inProgressWorkflowRuns: FilterAggregationResult;
      failedWorkflowRuns: FilterAggregationResult;

      allFilesCount: NumericAggregationResult;
      filesToQcCount: NumericAggregationResult;
      lastUpdate?: DateAggregationResult;
    };
  };

  if (ENABLE_ELASTICSEARCH_LOGGING) {
    logger.info(JSON.stringify(esQuery.toJSON()));
  }

  const result: QueryResult = await esClient
    .search({
      index: ELASTICSEARCH_PROGRAM_DONOR_DASHBOARD_INDEX,
      body: esQuery,
      track_total_hits: true,
    })
    .then((res) => {
      return res.body as QueryResult;
    })
    .catch((err) => {
      logger.error("error reading data from Elasticsearch: ", err);
      const defaultResult: QueryResult = {
        hits: {
          total: { value: 0, relation: "" },
          hits: [],
        },
        aggregations: {
          fullyReleasedDonorsCount: { doc_count: 0 },
          partiallyReleasedDonorsCount: { doc_count: 0 },
          noReleaseDonorsCount: { doc_count: 0 },
          donorsProcessingMolecularDataCount: { doc_count: 0 },
          donorsWithReleasedFilesCount: { doc_count: 0 },
          donorsWithPublishedNormalAndTumourSamples: { doc_count: 0 },
          donorsInvalidWithCurrentDictionary: { doc_count: 0 },
          donorsWithMatchedTNPair: { doc_count: 0 },

          completeCoreCompletion: { doc_count: 0 },
          incompleteCoreCompletion: { doc_count: 0 },
          noCoreCompletion: { doc_count: 0 },

          dnaTNRegisteredSamples: { doc_count: 0 },
          dnaOneOfTNRegisteredSamples: { doc_count: 0 },
          noDnaTNRegisteredSamples: { doc_count: 0 },

          dnaTNMatchedPairsSubmitted: { doc_count: 0 },
          noDnaTNMatchedPairsSubmitted: { doc_count: 0 },
          dnaTNMatchedPairsMissingRawReads: { doc_count: 0 },
          noDnaTNMatchedPairsData: { doc_count: 0 },

          rnaRegisteredSamples: { doc_count: 0 },
          noRnaRegisteredSamples: { doc_count: 0 },

          rnaSubmittedRawReads: { doc_count: 0 },
          noRnaSubmittedRawReads: { doc_count: 0 },

          rnaCompletedAlignment: { doc_count: 0 },
          rnaInProgressAlignment: { doc_count: 0 },
          rnaFailedAlignment: { doc_count: 0 },
          rnaNoAlignment: { doc_count: 0 },

          validSamplePairs: { doc_count: 0 },
          invalidSamplePairs: { doc_count: 0 },

          validRawReads: { doc_count: 0 },
          invalidRawReads: { doc_count: 0 },

          completedAlignment: { doc_count: 0 },
          inProgressAlignment: { doc_count: 0 },
          failedAlignment: { doc_count: 0 },
          noAlignment: { doc_count: 0 },

          completedSanger: { doc_count: 0 },
          inProgressSanger: { doc_count: 0 },
          failedSanger: { doc_count: 0 },
          noSanger: { doc_count: 0 },

          completedMutect: { doc_count: 0 },
          inProgressMutect: { doc_count: 0 },
          failedMutect: { doc_count: 0 },
          noMutect: { doc_count: 0 },

          completedOpenAccess: { doc_count: 0 },
          inProgressOpenAccess: { doc_count: 0 },
          failedOpenAccess: { doc_count: 0 },
          noOpenAccess: { doc_count: 0 },

          completedWorkflowRuns: { doc_count: 0 },
          inProgressWorkflowRuns: { doc_count: 0 },
          failedWorkflowRuns: { doc_count: 0 },

          allFilesCount: { value: 0 },
          filesToQcCount: { value: 0 },
        },
      };

      return defaultResult;
    });

  return {
    entries: result.hits.hits
      .map(({ _source }) => _source)
      .map(
        (doc) =>
          ({
            id: `${programShortName}::${doc.donorId}`,
            programShortName: doc.programId,
            alignmentsCompleted: doc.alignmentsCompleted,
            alignmentsFailed: doc.alignmentsFailed,
            alignmentsRunning: doc.alignmentsRunning,
            donorId: doc.donorId,
            processingStatus:
              doc.processingStatus ||
              DonorMolecularDataProcessingStatus.REGISTERED,
            programId: doc.programId,

            rnaRegisteredNormalSamples: doc.rnaRegisteredNormalSamples,
            rnaRegisteredTumourSamples: doc.rnaRegisteredTumourSamples,
            rnaPublishedNormalAnalysis: doc.rnaPublishedNormalAnalysis,
            rnaPublishedTumourAnalysis: doc.rnaPublishedTumourAnalysis,
            rnaAlignmentsCompleted: doc.rnaAlignmentsCompleted,
            rnaAlignmentsRunning: doc.rnaAlignmentsRunning,
            rnaAlignmentFailed: doc.rnaAlignmentFailed,

            matchedTNPairsDNA: doc.matchedTNPairsDNA,
            publishedNormalAnalysis: doc.publishedNormalAnalysis,
            publishedTumourAnalysis: doc.publishedTumourAnalysis,
            registeredNormalSamples: doc.registeredNormalSamples,
            registeredTumourSamples: doc.registeredTumourSamples,
            releaseStatus:
              doc.releaseStatus || DonorMolecularDataReleaseStatus.NO_RELEASE,
            sangerVcsCompleted: doc.sangerVcsCompleted,
            sangerVcsFailed: doc.sangerVcsFailed,
            sangerVcsRunning: doc.sangerVcsRunning,
            mutectCompleted: doc.mutectCompleted,
            mutectRunning: doc.mutectRunning,
            mutectFailed: doc.mutectFailed,
            openAccessCompleted: doc.openAccessCompleted,
            openAccessRunning: doc.openAccessRunning,
            openAccessFailed: doc.openAccessFailed,
            submittedCoreDataPercent: doc.submittedCoreDataPercent,
            submittedExtendedDataPercent: doc.submittedExtendedDataPercent,
            submitterDonorId: doc.submitterDonorId,
            validWithCurrentDictionary: doc.validWithCurrentDictionary,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          } as DonorSummaryEntry)
      ),
    stats: {
      registeredDonorsCount: result.hits.total.value,
      fullyReleasedDonorsCount:
        result.aggregations.fullyReleasedDonorsCount.doc_count,
      partiallyReleasedDonorsCount:
        result.aggregations.partiallyReleasedDonorsCount.doc_count,
      noReleaseDonorsCount: result.aggregations.noReleaseDonorsCount.doc_count,
      donorsProcessingMolecularDataCount:
        result.aggregations.donorsProcessingMolecularDataCount.doc_count,
      donorsWithReleasedFilesCount:
        result.aggregations.donorsWithReleasedFilesCount.doc_count,
      percentageTumourAndNormal: result.hits.total.value
        ? result.aggregations.donorsWithMatchedTNPair.doc_count /
          result.hits.total.value
        : 0,
      percentageCoreClinical: result.hits.total.value
        ? result.aggregations.completeCoreCompletion.doc_count /
          result.hits.total.value
        : 0,
      allFilesCount: result.aggregations.allFilesCount.value,
      filesToQcCount: result.aggregations.filesToQcCount.value,
      donorsInvalidWithCurrentDictionaryCount:
        result.aggregations.donorsInvalidWithCurrentDictionary.doc_count,

      completedWorkflowRuns:
        result.aggregations.completedWorkflowRuns.doc_count,
      inProgressWorkflowRuns:
        result.aggregations.inProgressWorkflowRuns.doc_count,
      failedWorkflowRuns: result.aggregations.failedWorkflowRuns.doc_count,

      coreCompletion: {
        completed: result.aggregations.completeCoreCompletion.doc_count,
        incomplete: result.aggregations.incompleteCoreCompletion.doc_count,
        noData: result.aggregations.noCoreCompletion.doc_count,
      },

      dnaTNRegisteredStatus: {
        tumorAndNormal: result.aggregations.dnaTNRegisteredSamples.doc_count,
        tumorOrNormal:
          result.aggregations.dnaOneOfTNRegisteredSamples.doc_count,
        noData: result.aggregations.noDnaTNRegisteredSamples.doc_count,
      },

      dnaTNMatchedPairStatus: {
        tumorNormalMatchedPair:
          result.aggregations.dnaTNMatchedPairsSubmitted.doc_count,
        tumorNormalNoMatchedPair:
          result.aggregations.noDnaTNMatchedPairsSubmitted.doc_count,
        tumorNormalMatchedPairMissingRawReads:
          result.aggregations.dnaTNMatchedPairsMissingRawReads.doc_count,
        noData: result.aggregations.noDnaTNMatchedPairsData.doc_count,
      },

      rnaSampleStatus: {
        dataSubmitted: result.aggregations.rnaRegisteredSamples.doc_count,
        noDataSubmitted: result.aggregations.noRnaRegisteredSamples.doc_count,
      },

      rnaRawReadStatus: {
        dataSubmitted: result.aggregations.rnaSubmittedRawReads.doc_count,
        noDataSubmitted: result.aggregations.noRnaSubmittedRawReads.doc_count,
      },

      rnaAlignmentStatusCount: {
        completed: result.aggregations.rnaCompletedAlignment.doc_count,
        inProgress: result.aggregations.rnaInProgressAlignment.doc_count,
        failed: result.aggregations.rnaFailedAlignment.doc_count,
        noData: result.aggregations.rnaNoAlignment.doc_count,
      },

      sampleStatus: {
        valid: result.aggregations.validSamplePairs.doc_count,
        invalid: result.aggregations.invalidSamplePairs.doc_count,
      },

      rawReadsStatus: {
        valid: result.aggregations.validRawReads.doc_count,
        invalid: result.aggregations.invalidRawReads.doc_count,
      },

      alignmentStatusCount: {
        completed: result.aggregations.completedAlignment.doc_count,
        inProgress: result.aggregations.inProgressAlignment.doc_count,
        failed: result.aggregations.failedAlignment.doc_count,
        noData: result.aggregations.noAlignment.doc_count,
      },

      sangerStatusCount: {
        completed: result.aggregations.completedSanger.doc_count,
        inProgress: result.aggregations.inProgressSanger.doc_count,
        failed: result.aggregations.failedSanger.doc_count,
        noData: result.aggregations.noSanger.doc_count,
      },

      mutectStatusCount: {
        completed: result.aggregations.completedMutect.doc_count,
        inProgress: result.aggregations.inProgressMutect.doc_count,
        failed: result.aggregations.failedMutect.doc_count,
        noData: result.aggregations.noMutect.doc_count,
      },

      openAccessStatusCount: {
        completed: result.aggregations.completedOpenAccess.doc_count,
        inProgress: result.aggregations.inProgressOpenAccess.doc_count,
        failed: result.aggregations.failedOpenAccess.doc_count,
        noData: result.aggregations.noOpenAccess.doc_count,
      },

      lastUpdate: result.aggregations.lastUpdate?.value
        ? new Date(result.aggregations.lastUpdate.value)
        : undefined,
    },
  };
};

export default programDonorSummaryEntriesAndStatsResolver;
