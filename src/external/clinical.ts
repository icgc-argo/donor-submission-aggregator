// /*
//  * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved
//  *
//  * This program and the accompanying materials are made available under the terms of
//  * the GNU Affero General Public License v3.0. You should have received a copy of the
//  * GNU Affero General Public License along with this program.
//  *  If not, see <http://www.gnu.org/licenses/>.
//  *
//  * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
//  * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
//  * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
//  * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
//  * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
//  * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
//  * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//  */

import _ from "lodash";
import fetch from "node-fetch";

import { CLINICAL_URL } from "../config";
import { getEgoToken } from "external/ego";

import logger from "../logger";

/**
 * The specific content in ClinicalDonor type is subject to change as the data-dictionary is updated,
 * so we try to only define here the bare minimum of fields that are needed to interact with and index the clinical data.
 *
 * Note: we receive all dates as strings. The type declaration here has them listed as strings, but if it makes sense in the future
 * we can parse them into proper Date objects when the `JSON.parse(donor)` is called.
 */
export type ClinicalDonor = {
  donorId: string;
  gender: string;
  programId: string;

  submitterId: string;
  createdAt: string;
  updatedAt: string;
  schemaMetadata: {
    isValid: boolean;
    lastValidSchemaVersion: string;
    originalSchemaVersion: string;
    lastMigrationId: string;
  };
  completionStats: {
    coreCompletion: {
      donor: number;
      specimens: number;
      primaryDiagnosis: number;
      followUps: number;
      treatments: number;
    };
    overriddenCoreCompletion: string[];
    coreCompletionPercentage: number;
    coreCompletionDate: string;
  };

  // core
  specimens: ClinicalSpecimen[];
  followUps: ClinicalFollowUp[];
  primaryDiagnoses: ClinicalPrimaryDiagnosis[];
  treatments: ClinicalTreatment[];

  // expanded
  familyHistory: ClinicalFamilyHistory[];
  exposure: ClinicalExposure[];
  comorbidity: ClinicalComorbidity[];
  biomarker: ClinicalBiomarker[];
};

export type ClinicalSpecimen = {
  samples: ClinicalSample[];
  specimenId: string;
  submitterId: string;
  tumourNormalDesignation: string;
  specimenType: string;
  specimenTissueSource: string;
};
export type ClinicalSample = {
  sampleId: string;
  submitterId: string;
  sampleType: string;
};
// TODO: The properties we want to index from the following types should be declared.
export type ClinicalFollowUp = {};
export type ClinicalPrimaryDiagnosis = {};
export type ClinicalTreatment = {};
export type ClinicalFamilyHistory = {};
export type ClinicalExposure = {};
export type ClinicalComorbidity = {};
export type ClinicalBiomarker = {};

export async function fetchDonor(programId: string, donorId: string) {
  try {
    logger.debug(
      `Fetcing clinical data for ${JSON.stringify({ programId, donorId })}`
    );
    const response = await fetch(
      `${CLINICAL_URL}/clinical/program/${programId}/donor/${donorId}`,
      {
        headers: {
          Authorization: `Bearer ${await getEgoToken("dcc")}`,
        },
      }
    );
    const donor = await response.json();
    return donor;
  } catch (e) {
    logger.warn(
      `Error fetching clinical data for ${JSON.stringify({
        programId,
        donorId,
      })}`,
      <Error>e
    );
    return undefined;
  }
}

export async function* fetchAllDonorsForProgram(
  programId: string
): AsyncGenerator<ClinicalDonor> {
  logger.debug(`Begining fetch of all donors for program: ${programId}`);
  const response = await fetch(
    `${CLINICAL_URL}/clinical/program/${programId}/donors`,
    {
      headers: {
        Authorization: `Bearer ${await getEgoToken("dcc")}`,
      },
    }
  );
  // Expected response is json-lines: new line delimited JSON documents that will be streamed in chunks
  // The next section turns the body response stream into an async iterator
  const body = response.body;
  let count = 0;
  for await (const chunk of body) {
    const chunkAsString = chunk.toString().split("\n");
    const donors = chunkAsString
      .filter((chunk) => !_.isEmpty(chunk))
      .map((chunk) => JSON.parse(chunk));
    for (const donor of donors) {
      yield donor;
      count++;
    }
  }
  logger.debug(`Retrieved ${count} donors for program: ${programId}`);
  return;
}
