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

export type ClinicalInfo = Record<
  string,
  string | number | boolean | undefined
>;

export type ClinicalSpecimen = {
  clinicalInfo: ClinicalInfo;
  samples: ClinicalSample[];
  specimenId: string;
  submitterId: string;
  tumourNormalDesignation: TumourNormalDesignation;
  specimenType: string;
  specimenTissueSource: string;
};
export type ClinicalSample = {
  clinicalInfo: ClinicalInfo;
  sampleId: string;
  submitterId: string;
  sampleType: string;
};
// TODO: The properties we want to index from the following types should be declared.
export type ClinicalFollowUp = {
  clinicalInfo: ClinicalInfo;
  followUpId: string;
};
export type ClinicalPrimaryDiagnosis = {
  clinicalInfo: ClinicalInfo;
  primaryDiagnosisId: string;
};
export type ClinicalTreatment = {
  clinicalInfo: ClinicalInfo;
  therapies: ClinicalTherapy[];
  treatmentId: string;
};
export type ClinicalTherapy = {
  clinicalInfo: ClinicalInfo;
  therapyId: string;
};
export type ClinicalFamilyHistory = {
  clinicalInfo: ClinicalInfo;
  familyHistoryId: string;
};
export type ClinicalExposure = {
  clinicalInfo: ClinicalInfo;
  exposureId: string;
};
export type ClinicalComorbidity = {
  clinicalInfo: ClinicalInfo;
  comorbidityId: string;
};
export type ClinicalBiomarker = {
  clinicalInfo: ClinicalInfo;
  biomarkerId: string;
};

export enum TumourNormalDesignation {
  Tumour = "Tumour",
  Normal = "Normal",
}
