import withRetry from 'promise-retry';
import { RETRY_CONFIG_RDPC_GATEWAY, rollcallConfig } from 'config';
import { getEsClient, setIndexWritable } from 'external/elasticsearch';
import createRollcallClient from 'external/rollCall';
import { ClinicalUpdateEvent } from './types';
import { getNewResolvedIndex, handleIndexingFailure } from './util';
import logger from 'logger';
import indexClinicalData from 'indexClinicalData';
import { RollCallClient } from 'external/rollCall/types';
import { Client } from '@elastic/elasticsearch';

/**
 * Processor for Clinical Update event
 * Will update donor aggregated data for an entire program that has received new clinical data submission
 * @param event
 * @param sendDlqMessage
 * @param services optional overwrite of the default services, useful for setting mocks in testing
 */
async function processClinicalUpdateEvent(
	event: ClinicalUpdateEvent,
	sendDlqMessage: (messageJSON: string) => Promise<void>,
	services: { esClient?: Client; rollcallClient?: RollCallClient } = {},
) {
	const { programId } = event;

	const esClient = services.esClient || (await getEsClient());
	const rollcallClient = services.rollcallClient || (await createRollcallClient(rollcallConfig));

	const doClone = true;

	try {
		withRetry(async (retry, attemptIndex) => {
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

				// Re-index all clinical data for this program.
				// Ideally, this would only update only the affected donors - an update to clinical is required to communicate this information in the kafka event.
				await indexClinicalData(programId, targetIndexName, esClient);

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

export default processClinicalUpdateEvent;
