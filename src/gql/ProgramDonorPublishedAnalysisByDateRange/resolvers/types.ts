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

export type BaseQueryArguments = {
  programShortName: string;
};

export type ResponseBucket = {
  date: string;
  donors: number;
};

export type ProgramDonorGqlResponse = {
  buckets: ResponseBucket[];
  title: string;
};

// keys are from elasticsearch
export type EsAggsBucket = {
  doc_count: number;
  key: string;
  to_as_string: string; // ISO date time
  to: number;
};

export type EsAggsBuckets = {
  buckets: EsAggsBucket[];
};

export type DonorFields =
  | "alignmentFirstPublishedDate"
  | "coreCompletionDate"
  | "mutectFirstPublishedDate"
  | "rawReadsFirstPublishedDate"
  | "sangerVcsFirstPublishedDate"
  | "openAccessFirstPublishedDate"
  | "rnaRawReadsFirstPublishedDate"
  | "rnaAlignmentFirstPublishedDate";

export type EsAggs = {
  [key in DonorFields]: EsAggsBuckets;
};
