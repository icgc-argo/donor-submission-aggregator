/*
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 * This program and the accompanying materials are made available under the terms of
 *
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

import esb from "elastic-builder";
import { GraphQLFieldResolver } from "graphql";
import {
  BaseQueryArguments,
  DonorFields,
  EsAggs,
  ProgramDonorGqlResponse,
} from "./types";
import { Client } from "@elastic/elasticsearch";
import { ELASTICSEARCH_PROGRAM_DONOR_DASHBOARD_INDEX } from "config";
import { ApolloError, UserInputError } from "apollo-server-express";
import { convertStringToISODate, validateISODate } from "utils";
import { ELASTICSEARCH_DATE_TIME_FORMAT } from "../../../constants/elasticsearch";
import { differenceInDays, sub as subDate, formatISO } from "date-fns";
import { GlobalGqlContext } from "gql/server";

const programDonorPublishedAnalysisByDateRangeResolver: (
  esClient: Client
) => GraphQLFieldResolver<
  unknown,
  GlobalGqlContext,
  BaseQueryArguments & {
    bucketCount: number;
    dateRangeFrom: string;
    dateRangeTo: string;
    donorFields: DonorFields[];
  }
> = (esClient) => async (
  source,
  args,
  context
): Promise<ProgramDonorGqlResponse[]> => {
  const {
    bucketCount,
    dateRangeTo,
    dateRangeFrom,
    donorFields,
    programShortName,
  } = args;

  if (bucketCount < 1) {
    throw new UserInputError(`bucketCount must be at least 1`, {
      bucketCount,
    });
  }

  const areDatesValid =
    validateISODate(dateRangeFrom) && validateISODate(dateRangeTo);
  if (!areDatesValid) {
    throw new UserInputError(`Dates must be in ISO format`, {
      dateRangeFrom,
      dateRangeTo,
    });
  }

  const isoDateRangeFrom = convertStringToISODate(dateRangeFrom);
  const isoDateRangeTo = convertStringToISODate(dateRangeTo);

  const daysInRange = differenceInDays(isoDateRangeTo, isoDateRangeFrom);
  if (daysInRange < 1) {
    throw new UserInputError(
      `dateRangeFrom must be a date before dateRangeTo`,
      {
        dateRangeFrom,
        dateRangeTo,
      }
    );
  }

  if (daysInRange < bucketCount) {
    throw new UserInputError(
      `Days in range must be greater than or equal to bucket count`,
      {
        bucketCount,
        dateRangeFrom,
        dateRangeTo,
        daysInRange,
      }
    );
  }

  const bucketDates = [...Array(bucketCount).keys()]
    .sort((a, b) => b - a)
    .map((bucketIndex: number) =>
      subDate(isoDateRangeTo, {
        days: Math.floor((daysInRange / bucketCount) * bucketIndex),
      })
    )
    .map((bucketDate: Date) => formatISO(bucketDate));

  const esQuery = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .filter(esb.termQuery("programId", programShortName))
        .should(
          donorFields.map((donorField: DonorFields) =>
            esb.existsQuery(donorField)
          )
        )
        .minimumShouldMatch(1)
    )
    .aggs(
      donorFields.map((donorField: DonorFields) =>
        esb
          .dateRangeAggregation(donorField, donorField)
          .format(ELASTICSEARCH_DATE_TIME_FORMAT)
          .ranges(bucketDates.map((bucketDate) => ({ to: bucketDate })))
      )
    );

  const esAggs: EsAggs = await esClient
    .search({
      body: esQuery,
      index: ELASTICSEARCH_PROGRAM_DONOR_DASHBOARD_INDEX,
    })
    .then((res) => res.body.aggregations)
    .catch((err) => {
      throw new ApolloError(err);
    });

  return Object.keys(esAggs).map((key: DonorFields) => ({
    title: key,
    buckets: esAggs[key].buckets.map((bucket) => ({
      date: bucket.to_as_string,
      donors: bucket.doc_count,
    })),
  }));
};

export default programDonorPublishedAnalysisByDateRangeResolver;
