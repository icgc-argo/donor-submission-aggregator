import { Client } from '@elastic/elasticsearch';
import { featureFlags, RETRY_CONFIG_RDPC_GATEWAY, rollcallConfig } from 'config';
import { getEsClient, setIndexWritable } from 'external/elasticsearch';
import createRollcallClient from 'external/rollCall';
import { RollCallClient } from 'external/rollCall/types';
import { indexFileData } from 'files';
import { getFilesByProgramId } from 'files/getFilesByProgramId';
import indexClinicalData from 'indexClinicalData';
import logger from 'logger';
import withRetry from 'promise-retry';
import { indexRdpcData } from 'rdpc';
import fetchAnalyses from 'rdpc/query/fetchAnalyses';
import fetchAnalysesWithSpecimens from 'rdpc/query/fetchAnalysesWithSpecimens';
import fetchDonorIdsByAnalysis from 'rdpc/query/fetchDonorIdsByAnalysis';
import fetchVariantCallingAnalyses from 'rdpc/query/fetchVariantCallingAnalyses';
import { SyncProgramEvent } from './types';
import { getNewResolvedIndex, handleIndexingFailure } from './util';

/**
 * Processor for Sync Program event
 * Will update donor aggregated data based on changes to an analysis belonging to the donor.
 * @param event
 * @param sendDlqMessage
 * @param services optional overwrite of the default services, useful for setting mocks in testing
 */
async function processSyncProgramEvent(
	event: SyncProgramEvent,
	sendDlqMessage: (messageJSON: string) => Promise<void>,
	services: {
		esClient?: Client;
		rollcallClient?: RollCallClient;
		analysesFetcher?: typeof fetchAnalyses;
		analysesWithSpecimensFetcher?: typeof fetchAnalysesWithSpecimens;
		fetchVC?: typeof fetchVariantCallingAnalyses;
		fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
		fileData?: typeof getFilesByProgramId;
	} = {},
) {
	const { programId } = event;

	// Set default service values
	const esClient = services.esClient || (await getEsClient());
	const rollcallClient = services.rollcallClient || (await createRollcallClient(rollcallConfig));
	const analysesFetcher = services.analysesFetcher || fetchAnalyses;
	const analysesWithSpecimensFetcher =
		services.analysesWithSpecimensFetcher || fetchAnalysesWithSpecimens;
	const fetchVC = services.fetchVC || fetchVariantCallingAnalyses;
	const fetchDonorIds = services.fetchDonorIds || fetchDonorIdsByAnalysis;
	const fileData = getFilesByProgramId;

	// For SYNC we do NOT want to clone, we are going to rebuild the entire index from scratch
	const doClone = false;

	try {
		await withRetry(async (retry, attemptIndex) => {
			const newResolvedIndex = await getNewResolvedIndex(
				programId,
				esClient,
				rollcallClient,
				doClone,
			);
			const targetIndexName = newResolvedIndex.indexName;

			try {
				await setIndexWritable(esClient, targetIndexName, true);
				logger.info(`Enabled index writing for: ${targetIndexName}`);

				// Generate Clinical and RPDC data for all analyses. We expect an empty index here (doClone = false)
				// so all donor data for this program needs to be gathered and added before release.
				await indexClinicalData(programId, targetIndexName, esClient);
				for (const rdpcUrl of event.rdpcGatewayUrls) {
					await indexRdpcData({
						programId,
						rdpcUrl,
						targetIndexName: targetIndexName,
						esClient,
						analysesFetcher,
						analysesWithSpecimensFetcher,
						fetchVC,
						fetchDonorIds,
					});
				}

				if (featureFlags.index.files) {
					await indexFileData(programId, fileData, targetIndexName, esClient);
				}

				logger.info(`Releasing index: ${targetIndexName}`);
				await rollcallClient.release(newResolvedIndex);
			} catch (indexingErr) {
				logger.warn(
					`Failed to index program ${programId} on attempt #${attemptIndex}: ${indexingErr}`,
				);
				await handleIndexingFailure({
					esClient,
					targetIndexName,
				});
				retry(indexingErr);
			}

			await setIndexWritable(esClient, targetIndexName, false);
			logger.info(`Disabled index writing for: ${targetIndexName}`);
		}, RETRY_CONFIG_RDPC_GATEWAY);
	} catch (retryErr) {
		logger.error(
			`Failed to index program ${programId} after ${
				RETRY_CONFIG_RDPC_GATEWAY.retries
			} attempts: ${JSON.stringify(retryErr)}`,
			retryErr,
		);

		// Message processing failed, make sure it is sent to the Dead Letter Queue.
		sendDlqMessage(JSON.stringify(event));
	}
}

export default processSyncProgramEvent;
