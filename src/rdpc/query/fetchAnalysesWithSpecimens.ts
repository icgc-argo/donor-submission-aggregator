import { getEgoToken } from 'external/ego';
import logger from 'logger';
import fetch from 'node-fetch';
import promiseRetry from 'promise-retry';
import { Analysis, AnalysisState } from 'rdpc/types';
import { QueryVariable } from './types';

const query = `
query ($analysisFilter: AnalysisFilter, $analysisPage: Page) {
    analyses (
      filter: $analysisFilter,
      page: $analysisPage,
      sorts:{fieldName:analysisId, order: asc}
    ) {
      content {
        analysisId
        analysisType
        experiment
        firstPublishedAt
        donors {
          donorId
          specimens {
            specimenId
            tumourNormalDesignation
            samples {
              sampleType
              submitterSampleId
              matchedNormalSubmitterSampleId
            }
          }
        }
      }
    }
}`;

const fetchAnalysesWithSpecimens = async ({
	studyId,
	rdpcUrl,
	analysisType,
	from,
	size,
	donorId,
}: {
	studyId: string;
	rdpcUrl: string;
	analysisType: string;
	from: number;
	size: number;
	donorId?: string;
}): Promise<Analysis[]> => {
	return await promiseRetry<Analysis[]>(async (retry) => {
		try {
			logger.info(`Fetching ${analysisType} analyses with specimens from rdpc.....`);
			const response = await fetch(rdpcUrl, {
				method: 'POST',
				body: JSON.stringify({
					query,
					variables: {
						analysisFilter: {
							analysisType: analysisType,
							analysisState: AnalysisState.PUBLISHED,
							studyId,
							donorId,
						},
						analysisPage: {
							from,
							size,
						},
					} as QueryVariable,
				}),
				headers: {
					'Content-type': 'application/json',
					authorization: `Bearer ${await getEgoToken()}`,
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
			logger.warn(
				`Failed to fetch sequencing experiment analyses with specimens: ${err}, retrying...`,
			);
			return retry(err);
		}
	}, retryConfig).catch((err) => {
		logger.error(
			`Failed to fetch analyses with specimens of program: ${studyId} from RDPC ${rdpcUrl} after ${retryConfig.retries} attempts: ${err}`,
		);
		throw err;
	});
};

const retryConfig = {
	factor: 2,
	retries: 3,
	minTimeout: 1000,
	maxTimeout: Infinity,
};

export default fetchAnalysesWithSpecimens;
