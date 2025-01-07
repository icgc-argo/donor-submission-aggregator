import { FILES_SERVICE_URL, FILES_STREAM_SIZE } from 'config';
import { getEgoToken } from 'external/ego';
import logger from 'logger';
import fetch from 'node-fetch';
import promiseRetry from 'promise-retry';
import { URL } from 'url';
import urljoin from 'url-join';
import { File } from './types';

export const getFilesByProgramId = async (programId: string, page: number): Promise<File[]> => {
	const fileQueryUrl = new URL(urljoin(FILES_SERVICE_URL, 'files'));
	fileQueryUrl.searchParams.append('page', page.toString());
	fileQueryUrl.searchParams.append('limit', FILES_STREAM_SIZE.toString());
	fileQueryUrl.searchParams.append('programId', programId);
	logger.info(`Getting files from: ${fileQueryUrl}`);

	return await promiseRetry<File[]>(async (retry) => {
		try {
			const response = await fetch(fileQueryUrl, {
				method: 'GET',
				headers: {
					'Content-type': 'application/json',
					authorization: `Bearer ${await getEgoToken()}`,
				},
			});
			const jsonResponse = await response.json();
			const hasError = jsonResponse.errors?.length > 0;
			if (hasError) {
				const error = JSON.stringify(jsonResponse.errors);
				logger.error(`Received error from files-service: ${error}`);
				throw new Error(error);
			}
			return jsonResponse.files as File[];
		} catch (err) {
			logger.warn(`Failed to get files of program ${programId}, retrying...`);
			return retry(err);
		}
	}, retryConfig).catch((err) => {
		logger.error(`Failed to get files of program ${programId} from files-service after
      ${retryConfig.retries} attempts: ${err}`);
		throw err;
	});
};

const retryConfig = {
	factor: 2,
	retries: 3,
	minTimeout: 3000,
	maxTimeout: Infinity,
};
