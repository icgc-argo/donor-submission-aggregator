import { DonorData, SamplePair, StringMap, TumourNormalDesignationValue } from 'rdpc/types';

export const mergedDonorData_page_1: StringMap<DonorData> = {
	DO35140: {
		donorId: 'DO35140',
		specimen: [
			{
				specimenId: 'SP113860',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Sp_R',
						matchedNormalSubmitterSampleId: null,
					},
				],
			},
			{
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_X',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					},
				],
			},
			{
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_P',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					},
				],
			},
		],
		samplePairs: [
			{
				normalSample: {
					specimenId: 'SP113860',
					tumourNormalDesignation: TumourNormalDesignationValue.Normal,
					submitterSampleId: 'PCSI_0085_Sp_R',
					matchedNormalSubmitterSampleId: '',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP77876',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_X',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WXS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP77876',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WXS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
		],
	},
};

export const mergedDonorData_page_2: StringMap<DonorData> = {
	DO35140: {
		donorId: 'DO35140',
		specimen: [
			{
				specimenId: 'SP78096',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Ly_R',
						matchedNormalSubmitterSampleId: null,
					},
				],
			},
			{
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_P',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					},
				],
			},
			{
				specimenId: 'SP125687',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_P_526',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_R',
					},
				],
			},
		],
		samplePairs: [
			{
				normalSample: {
					specimenId: 'SP78096',
					tumourNormalDesignation: TumourNormalDesignationValue.Normal,
					submitterSampleId: 'PCSI_0085_Ly_R',
					matchedNormalSubmitterSampleId: '',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP77876',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP125687',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P_526',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
		],
	},
};

export const mergedDonorData_page_3: StringMap<DonorData> = {
	DO35199: {
		donorId: 'DO35199',
		specimen: [
			{
				specimenId: 'SP78096',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Ly_R',
						matchedNormalSubmitterSampleId: null,
					},
				],
			},
		],
		samplePairs: [
			{
				normalSample: {
					specimenId: 'SP78096',
					tumourNormalDesignation: TumourNormalDesignationValue.Normal,
					submitterSampleId: 'PCSI_0085_Ly_R',
					matchedNormalSubmitterSampleId: '',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP77876',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP125687',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P_526',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
		],
	},
};

export const mergedDonorDataMap: StringMap<DonorData> = {
	DO35140: {
		donorId: 'DO35140',
		specimen: [
			{
				specimenId: 'SP113860',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Sp_R',
						matchedNormalSubmitterSampleId: null,
					},
				],
			},
			{
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_X',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					},
				],
			},
			{
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_P',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					},
				],
			},
			{
				specimenId: 'SP78096',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Ly_R',
						matchedNormalSubmitterSampleId: null,
					},
				],
			},
			{
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_P',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					},
				],
			},
			{
				specimenId: 'SP125687',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				samples: [
					{
						sampleType: 'Total DNA',
						submitterSampleId: 'PCSI_0085_Pa_P_526',
						matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_R',
					},
				],
			},
		],
		samplePairs: [
			{
				normalSample: {
					specimenId: 'SP113860',
					tumourNormalDesignation: TumourNormalDesignationValue.Normal,
					submitterSampleId: 'PCSI_0085_Sp_R',
					matchedNormalSubmitterSampleId: '',
					firstPublishedAt: '1607919342900',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607919342900,
			},
			{
				tumourSample: {
					specimenId: 'SP77876',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_X',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WXS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP77876',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WXS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				normalSample: {
					specimenId: 'SP78096',
					tumourNormalDesignation: TumourNormalDesignationValue.Normal,
					submitterSampleId: 'PCSI_0085_Ly_R',
					matchedNormalSubmitterSampleId: '',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP77876',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
					firstPublishedAt: '1699715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1699715342567,
			},
			{
				tumourSample: {
					specimenId: 'SP125687',
					tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
					submitterSampleId: 'PCSI_0085_Pa_P_526',
					matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_R',
					firstPublishedAt: '1607715342567',
					experimentStrategy: 'WGS',
					sampleType: 'Total DNA',
				},
				firstPublishedAt: 1607715342567,
			},
		],
	},
};

export const donorWithMatchedSamplePairs: StringMap<SamplePair[]> = {
	DO35140: [
		{
			normalSample: {
				specimenId: 'SP78096',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				submitterSampleId: 'PCSI_0085_Ly_R',
				matchedNormalSubmitterSampleId: '',
				firstPublishedAt: '1607715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			tumourSample: {
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				submitterSampleId: 'PCSI_0085_Pa_P',
				matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
				firstPublishedAt: '1699715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			firstPublishedAt: 1699715342567,
		},
		{
			normalSample: {
				specimenId: 'SP113860',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				submitterSampleId: 'PCSI_0085_Sp_R',
				matchedNormalSubmitterSampleId: '',
				firstPublishedAt: '1607715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			tumourSample: {
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				submitterSampleId: 'PCSI_0085_Pa_P_526',
				matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_R',
				firstPublishedAt: '1609715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			firstPublishedAt: 1609715342567,
		},
		{
			normalSample: {
				specimenId: 'SP113860',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				submitterSampleId: 'PCSI_0085_Sp_0',
				matchedNormalSubmitterSampleId: '',
				firstPublishedAt: '1607715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			tumourSample: {
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				submitterSampleId: 'PCSI_0085_Pa_P_22',
				matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_0',
				firstPublishedAt: '1619715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			firstPublishedAt: 1619715342567,
		},
	],
	DO35141: [
		{
			normalSample: {
				specimenId: 'SP78096',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				submitterSampleId: 'PCSI_0085_Ly_R',
				matchedNormalSubmitterSampleId: '',
				firstPublishedAt: '1607715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			tumourSample: {
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				submitterSampleId: 'PCSI_0085_Pa_P',
				matchedNormalSubmitterSampleId: 'PCSI_0085_Ly_R',
				firstPublishedAt: '1699715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			firstPublishedAt: 1699715342567,
		},
		{
			normalSample: {
				specimenId: 'SP113860',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				submitterSampleId: 'PCSI_0085_Sp_R',
				matchedNormalSubmitterSampleId: '',
				firstPublishedAt: '1607715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			tumourSample: {
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				submitterSampleId: 'PCSI_0085_Pa_P_526',
				matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_R',
				firstPublishedAt: '1799715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			firstPublishedAt: 1799715342567,
		},
		{
			normalSample: {
				specimenId: 'SP113860',
				tumourNormalDesignation: TumourNormalDesignationValue.Normal,
				submitterSampleId: 'PCSI_0085_Sp_0',
				matchedNormalSubmitterSampleId: '',
				firstPublishedAt: '1607715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			tumourSample: {
				specimenId: 'SP77876',
				tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
				submitterSampleId: 'PCSI_0085_Pa_P_22',
				matchedNormalSubmitterSampleId: 'PCSI_0085_Sp_0',
				firstPublishedAt: '1619715342567',
				experimentStrategy: 'WGS',
				sampleType: 'Total DNA',
			},
			firstPublishedAt: 1619715342567,
		},
	],
};
