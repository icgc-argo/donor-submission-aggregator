import { RollcallConfig } from 'config';
import donorIndexMapping from 'external/elasticsearch/donorIndexMapping.json';
import logger from 'logger';
import fetch from 'node-fetch';
import urljoin from 'url-join';
import {
	CreateResolvableIndexRequest,
	IndexReleaseRequest,
	ResolvedIndex,
	ResolvedIndexSchema,
	RollCallClient,
} from './types';

const createRollcallClient = (config: RollcallConfig): RollCallClient => {
	const { rootUrl, aliasName, indexEntity, indexType, shardPrefix } = config;

	const createNewResolvableIndex = async (
		programShortName: string,
		cloneFromReleasedIndex?: boolean,
	): Promise<ResolvedIndex> => {
		const url = urljoin(`${rootUrl}`, `/indices/create`);

		const req: CreateResolvableIndexRequest = {
			shardPrefix: shardPrefix,
			shard: await formatProgramShortName(programShortName),
			entity: indexEntity,
			type: indexType,
			cloneFromReleasedIndex: cloneFromReleasedIndex || false,
			indexSetting: JSON.stringify(donorIndexMapping.settings),
		};

		try {
			const newResolvedIndex = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(req),
				headers: { 'Content-Type': 'application/json' },
			}).then(async (res) => {
				if (!res.ok) {
					throw new Error(`Error while creating new index: ${res.statusText}`);
				}
				return await res.json();
			});
			return ResolvedIndexSchema.parse(newResolvedIndex);
		} catch (err) {
			logger.error('Failed to get new resolved index from rollcall: ' + err);
			throw err;
		}
	};

	const release = async (resovledIndex: ResolvedIndex): Promise<boolean> => {
		logger.info(`releasing index ${resovledIndex.indexName} to alias ${aliasName}`);
		const url = urljoin(`${rootUrl}`, `/aliases/release`);

		const req = await convertResolvedIndexToIndexReleaseRequest(resovledIndex);

		const acknowledged = (await fetch(url, {
			method: 'POST',
			body: JSON.stringify(req),
			headers: { 'Content-Type': 'application/json' },
		}).then((res) => res.json())) as boolean;

		return acknowledged;
	};

	const convertResolvedIndexToIndexReleaseRequest = async (
		resovledIndex: ResolvedIndex,
	): Promise<IndexReleaseRequest> => {
		const alias = aliasName;
		const shard = resovledIndex.shardPrefix + '_' + resovledIndex.shard;
		const release = resovledIndex.releasePrefix + '_' + resovledIndex.release;

		return { alias, release, shards: [shard] };
	};

	const formatProgramShortName = async (programShortName: string) => {
		return programShortName.replace('-', '').trim().toLowerCase();
	};

	return {
		createNewResolvableIndex,
		release,
	};
};

export default createRollcallClient;
