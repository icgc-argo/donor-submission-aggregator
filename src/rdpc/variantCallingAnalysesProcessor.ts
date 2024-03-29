import _ from 'lodash';
import logger from 'logger';
import { initializeRdpcInfo } from './analysesProcessor';
import fetchVariantCallingAnalyses from './query/fetchVariantCallingAnalyses';
import {
	Analysis,
	AnalysisType,
	DonorInfoMap,
	StringMap,
	WorkflowData,
	WorkflowInfo,
	WorkflowName,
} from './types';

export const variantCallingStream = async function* ({
	studyId,
	rdpcUrl,
	config,
	analysesFetcher = fetchVariantCallingAnalyses,
	donorId,
	analysisType = AnalysisType.VARIANT_CALLING,
}: {
	studyId: string;
	rdpcUrl: string;
	config: {
		chunkSize: number;
	};
	analysesFetcher: typeof fetchVariantCallingAnalyses;
	donorId?: string;
	analysisType?: AnalysisType;
}): AsyncGenerator<Analysis[]> {
	const chunkSize = config.chunkSize;
	const streamState: StreamState = {
		currentPage: 0,
	};

	while (true) {
		const page = await analysesFetcher({
			studyId,
			rdpcUrl,
			from: streamState.currentPage,
			size: chunkSize,
			donorId,
			analysisType,
		});

		// in case of api returns less analyses than chunk size, we need to stream from the last analysis
		// to make sure there is no data loss:
		streamState.currentPage += page.length < chunkSize ? page.length : chunkSize;

		if (page.length > 0) {
			yield page;
		} else {
			break;
		}
	}
};

export const convertEarliestDateToDonorInfo = (donors: StringMap<WorkflowInfo>): DonorInfoMap => {
	const result: DonorInfoMap = {};

	Object.entries(donors).forEach(([donorId, info]) => {
		initializeRdpcInfo(result, donorId);

		if (info.sangerVC[0]?.firstPublishedAt) {
			result[donorId].sangerVcsFirstPublishedDate = new Date(
				Number(info.sangerVC[0].firstPublishedAt),
			);
		}

		if (info.mutect[0]?.firstPublishedAt) {
			result[donorId].mutectFirstPublishedDate = new Date(Number(info.mutect[0].firstPublishedAt));
		}

		if (info.openAccess[0]?.firstPublishedAt) {
			result[donorId].openAccessFirstPublishedDate = new Date(
				Number(info.openAccess[0].firstPublishedAt),
			);
		}
	});

	return result;
};

// find the earliest dates by comparing workflow analyses' first published dates
export const getEarliestDateForDonor = (
	donors: StringMap<WorkflowInfo>,
): StringMap<WorkflowInfo> => {
	const result: StringMap<WorkflowInfo> = {};
	Object.entries(donors).forEach(([donorId, info]) => {
		const wfInfo: WorkflowInfo = { sangerVC: [], mutect: [], openAccess: [] };

		const earliestSanger = findEarliestWorkflow(info.sangerVC);
		if (earliestSanger) {
			wfInfo.sangerVC.push(earliestSanger);
		}

		const earliestMutect = findEarliestWorkflow(info.mutect);
		if (earliestMutect) {
			wfInfo.mutect.push(earliestMutect);
		}

		const earliestOpenAccess = findEarliestWorkflow(info.openAccess);
		if (earliestOpenAccess) {
			wfInfo.openAccess.push(earliestOpenAccess);
		}

		result[donorId] = wfInfo;
	});
	return result;
};

export const getAllMergedDonor_variantCalling = async ({
	analysesFetcher = fetchVariantCallingAnalyses,
	studyId,
	url,
	config,
	donorIds,
	analysisType = AnalysisType.VARIANT_CALLING,
}: {
	studyId: string;
	url: string;
	donorIds?: string[];
	config: {
		chunkSize: number;
		state?: StreamState;
	};
	analysesFetcher: typeof fetchVariantCallingAnalyses;
	analysisType?: AnalysisType;
}): Promise<StringMap<WorkflowInfo>> => {
	const mergedDonors: StringMap<WorkflowInfo> = {};

	if (donorIds) {
		for (const donorId of donorIds) {
			logger.info(`Streaming analyses for donor ${donorId}`);
			const stream = variantCallingStream({
				studyId,
				rdpcUrl: url,
				config,
				analysesFetcher,
				donorId,
				analysisType,
			});
			for await (const page of stream) {
				logger.info(
					`Streaming ${page.length} of '${analysisType}' analyses for sanger/mutect/open access first published dates...`,
				);
				const donorPerPage = convertAnalysis(page);
				mergeAllDonors(mergedDonors, donorPerPage);
			}
		}
	} else {
		const stream = variantCallingStream({
			studyId,
			rdpcUrl: url,
			config,
			analysesFetcher,
			analysisType,
		});
		for await (const page of stream) {
			logger.info(
				`Streaming ${page.length} of '${analysisType}' analyses for sanger/mutect/open access first published dates...`,
			);
			const donorPerPage = convertAnalysis(page);
			mergeAllDonors(mergedDonors, donorPerPage);
		}
	}
	return mergedDonors;
};

const mergeAllDonors = (merged: StringMap<WorkflowInfo>, mergeWith: StringMap<WorkflowInfo>) => {
	Object.entries(mergeWith).forEach(([donorId, info]) => {
		if (merged[donorId]) {
			merged[donorId].sangerVC = [...merged[donorId].sangerVC, ...info.sangerVC];
			merged[donorId].mutect = [...merged[donorId].mutect, ...info.mutect];
			merged[donorId].openAccess = [...merged[donorId].openAccess, ...info.openAccess];
		} else {
			merged[donorId] = info;
		}
	});
};

const convertAnalysis = (analyses: Analysis[]): StringMap<WorkflowInfo> => {
	const result: StringMap<WorkflowInfo> = {};
	analyses.forEach((analysis) => {
		const infoMapPerAnalysis = analysis.donors.reduce<StringMap<WorkflowInfo>>(
			(infoAccumulator, donor) => {
				let workflowName = '';
				if (analysis.workflow && analysis.workflow.workflowName) {
					workflowName = analysis.workflow.workflowName.toLocaleLowerCase();
				} else {
					logger.warn(`Incomplete RDPC Data: analysis id: ${analysis.analysisId} does not have 'workflow' or 'workflowname',
        this analysis won't be included in the donor's aggregated stats.`);
				}

				const info: WorkflowInfo = {
					sangerVC: [],
					mutect: [],
					openAccess: [],
				};

				if (analysis.firstPublishedAt == null || analysis.firstPublishedAt == '') {
					logger.warn(`Incomplete RDPC data: analysis id ${analysis.analysisId} firstPublishedAt value is null or empty,
          this analysis will not be counted towards donor ${donor.donorId}'s final 'firstPublishedAt' stats.`);
				}

				const workflowData = {
					analysisId: analysis.analysisId,
					workflowName: workflowName,
					firstPublishedAt: analysis.firstPublishedAt,
				};

				if (workflowName.includes(WorkflowName.MUTECT)) {
					info.mutect.push(workflowData);
				}

				if (workflowName.includes(WorkflowName.SANGER)) {
					info.sangerVC.push(workflowData);
				}

				if (workflowName.includes(WorkflowName.OPEN_ACCESS)) {
					info.openAccess.push(workflowData);
				}

				infoAccumulator[donor.donorId] = info;
				return infoAccumulator;
			},
			{},
		);

		mergeAllDonors(result, infoMapPerAnalysis);
	});
	return result;
};

// Finds the earliest published workflow, skips the current workflow if its firstPublishedAt is null or empty.
const findEarliestWorkflow = (workflow: WorkflowData[]): WorkflowData | undefined => {
	const earliestWf = _.head(
		_.sortBy(
			_.filter(workflow, (wf) => wf.firstPublishedAt !== null && wf.firstPublishedAt !== ''),
			(wf) => Number(wf.firstPublishedAt),
		),
	);
	return earliestWf;
};

type StreamState = {
	currentPage: number;
};
