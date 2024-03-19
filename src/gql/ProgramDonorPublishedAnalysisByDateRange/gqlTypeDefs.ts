/*
 * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved
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

import { gql } from "apollo-server-express";

export default gql`
  scalar DateTime

  type DateRangeBucket {
    """
    This date is the last day in this date range bucket.
    """
    date: DateTime
    """
    Number of donors with data published for the relevant analysis, from the beginning of time to this date.
    """
    donors: Int
  }

  """
  Date range aggregations for a given donor field.
  """
  type AnalysisObject {
    buckets: [DateRangeBucket]
    title: DonorField
  }

  enum DonorField {
    """
    Timestamp of when this donor first had alignment data published
    """
    alignmentFirstPublishedDate
    """
    Timestamp of when this donor first had core clinical data completed
    """
    coreCompletionDate
    """
    Timestamp of when this donor first had Mutect2 variant callings data published
    """
    mutectFirstPublishedDate
    """
    Timestamp of when this donor first had raw reads data published
    """
    rawReadsFirstPublishedDate
    """
    Timestamp of when this donor first had Sanger VC data published
    """
    sangerVcsFirstPublishedDate
    """
    Timestamp of when this donor first had Open Access data published
    """
    openAccessFirstPublishedDate
    """
    Timestamp of when this donor first had RNA raw reads data published
    """
    rnaRawReadsFirstPublishedDate
    """
    Timestamp of when this donor first had RNA alignment data published
    """
    rnaAlignmentFirstPublishedDate
  }

  type Query {
    """
    This query is for finding out how many donors for a given program had data of given types (donorFields) published for the first time before the end of the given date range. The donor count is aggregated into buckets (bucketCount) by date. There must be at least one day per bucket, i.e. the number of days between dateRangeFrom and dateRangeTo must be greater than or equal to bucketCount.
    """
    programDonorPublishedAnalysisByDateRange(
      """
      bucketCount is used to divide the days between dateRangeFrom and dateRangeTo into date ranges containing at least 1 day each.
      """
      bucketCount: Int = 7
      """
      dateRangeFrom won't appear in the result, unless the days between dateRangeFrom and dateRangeTo are equal to bucketCount. The first date in the result is the last day of the first date range bucket.
      """
      dateRangeFrom: DateTime!
      dateRangeTo: DateTime!
      """
      Donors are aggregated based on these fields, by date range.
      """
      donorFields: [DonorField]!
      programShortName: String!
    ): [AnalysisObject]!
  }
`;
