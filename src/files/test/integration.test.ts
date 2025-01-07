import { Client } from '@elastic/elasticsearch';
import { expect } from 'chai';
import esb from 'elastic-builder';
import { initIndexMapping } from 'external/elasticsearch';
import { indexFileData } from 'files';
import { getFilesByProgramId } from 'files/getFilesByProgramId';
import { File } from 'files/types';
import { EsHit } from 'indexClinicalData/types';
import { Duration, TemporalUnit } from 'node-duration';
import { clinicalDataset } from 'rdpc/test/fixtures/integrationTest/dataset';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { expectedFileData, files } from './files';

describe('should index file data', () => {
	let elasticsearchContainer: StartedTestContainer;
	let esClient: Client;
	const ES_PORT = 10092;
	const TEST_PROGRAM = 'TEST-CA';
	const INDEX_NAME = 'test';
	const NETOWRK_MODE = 'host';
	const donorIds = clinicalDataset.map((doc) => doc.donorId);

	const mockFileData: typeof getFilesByProgramId = async (
		programId: string,
		page: number,
	): Promise<File[]> => {
		return files;
	};

	before(async () => {
		try {
			elasticsearchContainer = await new GenericContainer('elasticsearch', '7.5.0')
				.withNetworkMode(NETOWRK_MODE)
				.withExposedPorts(ES_PORT)
				.withEnv('discovery.type', 'single-node')
				.withEnv('http.port', `${ES_PORT}`)
				.withHealthCheck({
					test: `curl -f http://localhost:${ES_PORT} || exit 1`, // this is executed inside the container
					startPeriod: new Duration(2, TemporalUnit.SECONDS),
					retries: 2,
					interval: new Duration(1, TemporalUnit.SECONDS),
					timeout: new Duration(5, TemporalUnit.SECONDS),
				})
				.withWaitStrategy(Wait.forHealthCheck())
				.start();

			const ES_MAPPED_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}`;
			const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;

			esClient = new Client({ node: ES_HOST });
		} catch (err) {
			console.log('brfore >>>>>>>>>>>>', err);
		}
	});

	beforeEach(async () => {
		console.log('beforeEach >>>>>>>>>>>', `creating index ${INDEX_NAME}...`);
		await esClient.indices.create({
			index: INDEX_NAME,
		});
		await initIndexMapping(INDEX_NAME, esClient);
		console.log('beforeEach >>>>>>>>>>> Initializing index mapping is complete');
	});

	after(async () => {
		await elasticsearchContainer.stop();
	});

	afterEach(async () => {
		await esClient.indices.delete({
			index: INDEX_NAME,
		});
	});

	it('should convert file data from files-service and populate releaseStatus field in ES index.', async () => {
		const { body: exists } = await esClient.indices.exists({
			index: INDEX_NAME,
		});
		expect(exists).to.be.true;

		// index testing clinical data
		console.log(`Indexing clinical data to index ${INDEX_NAME}`);
		const body = clinicalDataset.flatMap((doc) => [{ index: { _index: INDEX_NAME } }, doc]);

		await esClient.bulk({
			body,
			refresh: 'wait_for',
		});

		const indexedClinicalDocuments = (
			await esClient.search({
				index: INDEX_NAME,
				track_total_hits: true,
			})
		).body?.hits?.total;

		console.log('Total numer of indexed clinical documents: ', indexedClinicalDocuments.value);

		expect(indexedClinicalDocuments.value).to.equal(clinicalDataset.length);
		console.log('Begin indexing file data....');

		await indexFileData(TEST_PROGRAM, mockFileData, INDEX_NAME, esClient);

		const totalEsDocumentsCount = (
			await esClient.search({
				index: INDEX_NAME,
				track_total_hits: true,
			})
		).body?.hits?.total?.value;

		console.log('Total donors indexed: ', totalEsDocumentsCount);
		expect(totalEsDocumentsCount).to.equal(donorIds.length);

		// Verify if all es documents have correct releaseStatus value:
		const esHits = await Promise.all(
			donorIds.map(async (donorId) => {
				const esQuery = esb
					.requestBodySearch()
					.size(donorIds.length)
					.query(esb.termQuery('donorId', donorId));

				const esHits: EsHit = await esClient
					.search({
						index: INDEX_NAME,
						body: esQuery,
					})
					.then((res) => res.body.hits.hits[0])
					.catch((err) => {
						return null;
					});
				return esHits;
			}),
		);

		for (const hit of esHits) {
			console.log(
				`expecting ${hit._source.donorId} releaseStatus: ${
					hit._source.releaseStatus
				} to be equal to expected value:${expectedFileData[hit._source.donorId]}`,
			);
			expect(hit._source.releaseStatus).to.equal(expectedFileData[hit._source.donorId]);
		}
	});
});
