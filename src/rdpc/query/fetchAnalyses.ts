import {
	MUTECT_REPO_URL,
	OPEN_ACCESS_REPO_URL,
	RNA_SEQ_ALIGN_REPO_URL,
	SANGER_VC_REPO_URL,
	SEQ_ALIGN_REPO_URL,
} from 'config';
import { getEgoToken } from 'external/ego';
import logger from 'logger';
import fetch from 'node-fetch';
import promiseRetry from 'promise-retry';
import { Analysis, AnalysisState, AnalysisType, WorkflowName } from '../types';
import { QueryVariable } from './types';

const query = `
fragment AnalysisData on Analysis {
  analysisId
  analysisType
  donors {
    donorId
  }
}

query($analysisFilter: AnalysisFilter, $analysisPage: Page, $workflowRepoUrl: String) {
  analyses(
    filter: $analysisFilter,
    page: $analysisPage,
    sorts:{fieldName:analysisId, order: asc}
  ) {
    content {
      ...AnalysisData
      runs: inputForRuns(
        filter: {
          repository: $workflowRepoUrl
        }
      ) {
          runId
          state
          repository
          inputAnalyses {
              analysisId
              analysisType
          }
          producedAnalyses
            (filter: { analysisState: PUBLISHED }) {
              analysisId
              analysisState
              analysisType
            }
        }
    }

  }
}
`;

const fetchAnalyses = async ({
	studyId,
	rdpcUrl,
	analysisType,
	workflowName,
	from,
	size,
	isRNA,
	donorId,
}: {
	studyId: string;
	rdpcUrl: string;
	analysisType: string;
	workflowName: WorkflowName;
	from: number;
	size: number;
	isRNA: boolean;
	donorId?: string;
}): Promise<Analysis[]> => {
	return await promiseRetry<Analysis[]>(async (retry) => {
		try {
			const workflowRepoUrl = isRNA
				? getRnaWorkflowRepoUrl(analysisType, workflowName)
				: getDnaWorkflowRepoUrl(analysisType, workflowName);

			const response = await fetch(rdpcUrl, {
				method: 'POST',
				body: JSON.stringify({
					query,
					variables: {
						analysisFilter: {
							analysisState: AnalysisState.PUBLISHED,
							analysisType,
							studyId,
							donorId,
						},
						analysisPage: {
							from,
							size,
						},
						workflowRepoUrl,
					} as QueryVariable,
				}),
				headers: {
					'Content-type': 'application/json',
					authorization: `Bearer ${await getEgoToken('rdpc')}`,
				},
			});
			const jsonResponse = await response.json();
			const hasError = jsonResponse.errors?.length > 0;
			if (hasError) {
				const error = JSON.stringify(jsonResponse.errors);
				logger.error(
					`received error from rdpc... page: from => ${from} size => ${size}. Error: ${error}`,
				);
				throw new Error(error);
			}
			return jsonResponse.data.analyses.content as Analysis[];
		} catch (err) {
			logger.warn(`Failed to fetch ${analysisType} analyses: ${err}, retrying...`);
			return retry(err);
		}
	}, retryConfig).catch((err) => {
		logger.error(
			`Failed to fetch analyses of program:
       ${studyId} from RDPC ${rdpcUrl} after ${retryConfig.retries} attempts: ${err}`,
		);
		throw err;
	});
};

const getRnaWorkflowRepoUrl = (analysisType: string, workflowName: WorkflowName): string => {
	logger.info(`Starting to query ${analysisType} analyses for RNA alignment workflow runs`);
	// currently only have RNA seq alignment workflow
	return RNA_SEQ_ALIGN_REPO_URL;
};

const getDnaWorkflowRepoUrl = (analysisType: string, workflowName: WorkflowName): string => {
	if (analysisType === AnalysisType.SEQ_EXPERIMENT) {
		logger.info(`Starting to query ${analysisType} analyses for DNA alignment workflow runs`);
		return SEQ_ALIGN_REPO_URL;
	} else if (analysisType === AnalysisType.SEQ_ALIGNMENT) {
		switch (workflowName) {
			case WorkflowName.MUTECT:
				logger.info(`Starting to query ${analysisType} analyses for DNA mutect2 workflow runs`);
				return MUTECT_REPO_URL;
			case WorkflowName.SANGER:
				logger.info(
					`Starting to query ${analysisType} analyses for DNA sanger variant calling workflow runs`,
				);
				return SANGER_VC_REPO_URL;
			default:
				logger.info(
					`Attempted to query '${analysisType}' analyses for DNA '${workflowName}' workflow runs, no repo url found`,
				);
				return '';
		}
	} else if (
		analysisType === AnalysisType.VARIANT_CALLING &&
		workflowName === WorkflowName.OPEN_ACCESS
	) {
		logger.info(`Starting to query ${analysisType} analyses for DNA open access workflow runs`);
		return OPEN_ACCESS_REPO_URL;
	} else {
		logger.info(
			`Attempted to query '${analysisType}' analyses for DNA '${workflowName}' workflow runs, no repo url found`,
		);
		return '';
	}
};

const retryConfig = {
	factor: 2,
	retries: 3,
	minTimeout: 3000,
	maxTimeout: Infinity,
};

export default fetchAnalyses;
