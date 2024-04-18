import { Client } from '@elastic/elasticsearch';
import { rollcallConfig } from 'config';
import { getIndexSettings, getLatestIndexName, initIndexMapping } from 'external/elasticsearch';
import donorIndexMapping from 'external/elasticsearch/donorIndexMapping.json';
import { ResolvedIndex, RollCallClient } from 'external/rollCall/types';
import logger from 'logger';

export const generateIndexName = (programId: string): string => {
	const programName = programId.replace('-', '').toLocaleLowerCase();
	return `${rollcallConfig.indexEntity}_${rollcallConfig.indexType}_${rollcallConfig.shardPrefix}_${programName}_`;
};

const newIndexAndInitializeMapping = async (
	rollCallClient: RollCallClient,
	esClient: Client,
	programId: string,
	cloneFromReleasedIndex: boolean,
): Promise<ResolvedIndex> => {
	const newResolvedIndex = await rollCallClient.createNewResolvableIndex(
		programId.toLowerCase(),
		cloneFromReleasedIndex,
	);
	logger.info(`Obtained new index name: ${newResolvedIndex.indexName}`);
	await initIndexMapping(newResolvedIndex.indexName, esClient);
	return newResolvedIndex;
};

/**
 *
 * @param programId
 * @param esClient
 * @param rollCallClient
 * @param cloneExisting Indicator that the existing index can be used as a starting point for the new index. If false, a new index will be created without cloning the existing index.
 * @returns New index from roll call, with existing documents if cloneExisting is true
 */
export const getNewResolvedIndex = async (
	programId: string,
	esClient: Client,
	rollCallClient: RollCallClient,
	cloneExisting: boolean,
): Promise<ResolvedIndex> => {
	let newResolvedIndex: ResolvedIndex | null = null;

	let existingIndexName: string | undefined;
	try {
		existingIndexName = await getLatestIndexName(esClient, programId);
	} catch (err) {
		logger.error(
			`error while trying to get existing index for program ${programId} ${JSON.stringify(err)}`,
			err,
		);
		if (err.meta?.body?.status == 404) {
			logger.info(`no existing index for program ${programId}`);
		} else {
			throw err;
		}
	}

	if (existingIndexName) {
		const response = await getIndexSettings(esClient, existingIndexName);
		const indexSettings = response.body[existingIndexName].settings.index;
		const currentNumOfShards = parseInt(indexSettings.number_of_shards);
		const currentNumOfReplicas = parseInt(indexSettings.number_of_replicas);

		// check if existing latest index settings match default settings
		const indexSettingsMatch =
			currentNumOfReplicas === donorIndexMapping.settings['index.number_of_replicas'] &&
			currentNumOfShards === donorIndexMapping.settings['index.number_of_shards'];

		const doClone = cloneExisting && indexSettingsMatch;

		logger.info(`Obtaining new index, clone = ${doClone}`);
		newResolvedIndex = await newIndexAndInitializeMapping(
			rollCallClient,
			esClient,
			programId,
			doClone,
		);

		if (cloneExisting && !indexSettingsMatch) {
			// We want an index with all existing documents but could not clone due to settings mismatch,
			//   so let's copy over all the existing documents into our new index!
			logger.info(
				`Existing index could not be cloned due to incorrect existing settings: ${JSON.stringify({
					number_of_replicas: donorIndexMapping.settings['index.number_of_replicas'],
					number_of_shards: donorIndexMapping.settings['index.number_of_shards'],
				})}`,
			);

			logger.info(
				`Begin reindexing all documents from ${existingIndexName} to ${newResolvedIndex.indexName}`,
			);
			await esClient.reindex({
				body: {
					source: {
						index: existingIndexName,
					},
					dest: {
						index: newResolvedIndex.indexName,
					},
				},
				refresh: true,
			});
			logger.info(
				`Reindexed all documents from ${existingIndexName} to ${newResolvedIndex.indexName}`,
			);
		}
	} else {
		// if no index exists for program, get a new index name
		logger.info('Obtaining new index, first for program.');
		newResolvedIndex = await newIndexAndInitializeMapping(
			rollCallClient,
			esClient,
			programId,
			false,
		);
	}
	return newResolvedIndex;
};

export const handleIndexingFailure = async ({
	esClient,
	targetIndexName,
}: {
	esClient: Client;
	targetIndexName: string;
}) => {
	// If there was any issues building the index data, writing to the index, or saving the index
	//   then we should delete the index instead of leaving the incomplete index in ES
	await esClient.indices
		.delete({
			index: targetIndexName,
		})
		.catch((err) => {
			logger.error(`Error deleting index ${targetIndexName}: ${err}`);
		});
	logger.info(`Index was removed: ${targetIndexName}`);
};
