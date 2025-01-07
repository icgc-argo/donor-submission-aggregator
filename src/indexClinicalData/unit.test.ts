import { expect } from 'chai';
import uuid from 'uuid';
import { ClinicalDonor } from '../external/clinical/types';
import transformToEsDonor from './transformToEsDonor';
import { EsDonorDocument } from './types';

const TEST_PROGRAM_SHORT_NAME = 'TESTPROG-CA';

const createDonor = (programShortName: string) => {
	const submitterId = uuid();
	return {
		programId: programShortName,
		gender: 'female',
		submitterId: submitterId,
		createdAt: new Date().toString(),
		updatedAt: new Date().toString(),
		donorId: `DO${Math.floor(Math.random() * 10000)}`,
		schemaMetadata: {
			isValid: true,
			lastValidSchemaVersion: '',
			originalSchemaVersion: '',
			lastMigrationId: uuid(),
		},
		completionStats: {
			coreCompletion: {
				donor: 1,
				specimens: 0,
				primaryDiagnosis: 1,
				followUps: 0,
				treatments: 1,
			},
			coreCompletionPercentage: 0.666666666666667,
			overriddenCoreCompletion: [],
			coreCompletionDate: new Date().toISOString(),
		},
		clinicalInfo: {},
		primaryDiagnosis: {
			clinicalInfo: {},
		},
		specimens: [
			{
				samples: [
					{
						sampleId: 'SA410900',
						submitterId: '8034252',
						sampleType: 'Total DNA',
						clinicalInfo: {},
					},
				],
				specimenId: 'SP71456',
				submitterId: '8034252',
				clinicalInfo: {},
				tumourNormalDesignation: 'Tumour',
				specimenType: 'Primary tumour',
				specimenTissueSource: 'Solid tissue',
			},
			{
				samples: [
					{
						sampleId: 'SA410911',
						submitterId: '8034254',
						sampleType: 'Total RNA',
						clinicalInfo: {},
					},
				],
				specimenId: 'SP71464',
				submitterId: '8034254',
				clinicalInfo: {},
				tumourNormalDesignation: 'Tumour',
				specimenType: 'Primary tumour',
				specimenTissueSource: 'Other',
			},
			{
				samples: [
					{
						sampleId: 'SA410910',
						submitterId: '8034251',
						sampleType: 'Total RNA',
						clinicalInfo: {},
					},
				],
				specimenId: 'SP71460',
				submitterId: '8034251',
				clinicalInfo: {},
				tumourNormalDesignation: 'Normal',
				specimenType: 'Normal',
				specimenTissueSource: 'Other',
			},
			{
				samples: [
					{
						sampleId: 'SA410916',
						submitterId: '8034258',
						sampleType: 'Total DNA',
						clinicalInfo: {},
					},
				],
				specimenId: 'SP71472',
				submitterId: '8034258',
				clinicalInfo: {},
				tumourNormalDesignation: 'Normal',
				specimenType: 'Normal',
				specimenTissueSource: 'Solid tissue',
			},
			{
				samples: [
					{
						sampleId: 'SA410916',
						submitterId: '8034258',
						sampleType: 'Total DNA',
						clinicalInfo: {},
					},
					{
						sampleId: 'SA410916',
						submitterId: '8034258',
						sampleType: 'Total RNA',
						clinicalInfo: {},
					},
				],
				specimenId: 'SP75472',
				submitterId: '534258',
				clinicalInfo: {},
				tumourNormalDesignation: 'Normal',
				specimenType: 'Normal',
				specimenTissueSource: 'Solid tissue',
			},
		],
		followUps: [],
		treatments: [],
		primaryDiagnoses: [],
		familyHistory: [],
		exposure: [],
		comorbidity: [],
		biomarker: [],
	} as ClinicalDonor;
};

describe('transformToEsDonor', () => {
	it('must transform properly', async () => {
		const clinicalDoc = createDonor(TEST_PROGRAM_SHORT_NAME);
		const esDoc = transformToEsDonor(clinicalDoc as ClinicalDonor);

		expect(esDoc).to.deep.equal({
			validWithCurrentDictionary: true,
			releaseStatus: 'NO_RELEASE',
			donorId: clinicalDoc.donorId,
			submitterDonorId: clinicalDoc.submitterId,
			programId: TEST_PROGRAM_SHORT_NAME,
			submittedCoreDataPercent: 0.666666666666667,
			submittedExtendedDataPercent: 0, // this calculation is not yet defined
			registeredNormalSamples: 2,
			registeredTumourSamples: 1,
			rnaRegisteredNormalSamples: 2,
			rnaRegisteredTumourSamples: 1,
			matchedTNPairsDNA: 0,
			rnaPublishedNormalAnalysis: 0,
			rnaPublishedTumourAnalysis: 0,
			rnaAlignmentsCompleted: 0,
			rnaAlignmentsRunning: 0,
			rnaAlignmentFailed: 0,
			publishedNormalAnalysis: 0,
			publishedTumourAnalysis: 0,
			alignmentsCompleted: 0,
			alignmentsRunning: 0,
			alignmentsFailed: 0,
			sangerVcsCompleted: 0,
			sangerVcsRunning: 0,
			sangerVcsFailed: 0,
			mutectCompleted: 0,
			mutectFailed: 0,
			mutectRunning: 0,
			openAccessCompleted: 0,
			openAccessFailed: 0,
			openAccessRunning: 0,
			processingStatus: 'REGISTERED',
			coreCompletionDate: new Date(clinicalDoc.completionStats.coreCompletionDate),
			updatedAt: new Date(clinicalDoc.updatedAt),
			createdAt: new Date(clinicalDoc.createdAt),
			totalFilesCount: 0,
			filesToQcCount: 0,
		} as EsDonorDocument);
	});
});
