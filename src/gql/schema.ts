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

import { makeExecutableSchema } from "graphql-tools";
import { merge } from "lodash";
import ProgramDonorSummary from "./ProgramDonorSummary/typeDefs";
import ProgramDonorPublishedAnalysisByDateRange from "./ProgramDonorPublishedAnalysisByDateRange/typeDefs";
import createResolversProgramDonorSummary from "./ProgramDonorSummary/resolvers";
import createResolversProgramDonorPublishedAnalysisByDateRange from "./ProgramDonorPublishedAnalysisByDateRange/resolvers";
import { Client } from "@elastic/elasticsearch";

const createSchema = async ({ esClient }: { esClient: Client }) => {
  const ProgramSummaryResolvers = await createResolversProgramDonorSummary(
    esClient
  );
  const ProgramDonorPublishedAnalysisByDateRangeResolvers = await createResolversProgramDonorPublishedAnalysisByDateRange(
    esClient
  );

  return makeExecutableSchema({
    typeDefs: [ProgramDonorSummary, ProgramDonorPublishedAnalysisByDateRange],
    resolvers: merge(
      ProgramSummaryResolvers,
      ProgramDonorPublishedAnalysisByDateRangeResolvers
    ),
  });
};

export default createSchema;
