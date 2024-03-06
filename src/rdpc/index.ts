import { initialRdpcInfo, mergeDonorInfo } from './analysesProcessor';
import { STREAM_CHUNK_SIZE } from 'config';
import { queryDocumentsByDonorIds } from 'indexClinicalData';
import { Client } from '@elastic/elasticsearch';
import { EsDonorDocument, EsHit, RdpcDonorInfo } from 'indexClinicalData/types';
import { toEsBulkIndexActions } from 'external/elasticsearch';
import logger from 'logger';
import fetchAnalyses from './query/fetchAnalyses';
import fetchDonorIdsByAnalysis from './query/fetchDonorIdsByAnalysis';
import { AnalysisType, WorkflowName } from './types';
import fetchVariantCallingAnalyses from './query/fetchVariantCallingAnalyses';
import { getSangerData } from './convertData/getSangerData';
import { getAlignmentData } from './convertData/getAlignmentData';
import { getSeqExpSpecimenData } from './convertData/getSeqExpSpecimenData';
import { getSeqAlignSpecimenData } from './convertData/getSeqAlignSpecimenData';
import { getMutectData } from './convertData/getMutectData';
import { getOpenAccessData } from './convertData/getOpenAccessData';
import fetchAnalysesWithSpecimens from './query/fetchAnalysesWithSpecimens';
import { getVariantCallingData } from './convertData/getVariantCallingData';
import _ from 'lodash';

export const convertToEsDocument = (
	existingEsHit: EsDonorDocument,
	rdpcInfo?: RdpcDonorInfo,
): EsDonorDocument => {
	existingEsHit.updatedAt = new Date();
	return { ...existingEsHit, ...rdpcInfo };
};

export const indexRdpcData = async ({
	programId,
	rdpcUrl,
	targetIndexName,
	esClient,
	analysesFetcher = fetchAnalyses,
	analysesWithSpecimensFetcher = fetchAnalysesWithSpecimens,
	fetchVC = fetchVariantCallingAnalyses,
	fetchDonorIds = fetchDonorIdsByAnalysis,
	analysisId,
}: {
	programId: string;
	rdpcUrl: string;
	targetIndexName: string;
	esClient: Client;
	analysesFetcher?: typeof fetchAnalyses; // optional only for test
	fetchVC?: typeof fetchVariantCallingAnalyses; // optional only for test
	analysesWithSpecimensFetcher?: typeof fetchAnalysesWithSpecimens; // optional only for test
	analysisId?: string;
	fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
}) => {
	logger.info(`Processing program: ${programId} from ${rdpcUrl}.`);
	const config = { chunkSize: STREAM_CHUNK_SIZE };

	const donorIdsToFilterBy = analysisId
		? await fetchDonorIds({
				rdpcUrl,
				analysisId,
			})
		: undefined;

	// contains 5 fields:
	// rnaPublishedNormalAnalysis, rnaPublishedTumourAnalysis, publishedNormalAnalysis, publishedTumourAnalysis, rawReadsFirstPublishedDate
	const rdpcInfoByDonor_specimens = await getSeqExpSpecimenData(
		programId,
		rdpcUrl,
		AnalysisType.SEQ_EXPERIMENT,
		analysesWithSpecimensFetcher,
		config,
		donorIdsToFilterBy,
	);

	donorIdsToFilterBy?.forEach((donorId) => {
		if (!rdpcInfoByDonor_specimens.hasOwnProperty(donorId)) {
			rdpcInfoByDonor_specimens[donorId] = { ...initialRdpcInfo };
		}
	});

	// contains 2 fields: mutectFirstPublishedDate, sangerVcsFirstPublishedDate
	const rdpcInfoByDonor_sangerMutectDates = await getVariantCallingData(
		programId,
		rdpcUrl,
		fetchVC,
		config,
		donorIdsToFilterBy,
		AnalysisType.VARIANT_CALLING,
	);

	// contains 1 field: openAccessFirstPublishedDate
	const rdpcInfoByDonor_openAccessDate = await getVariantCallingData(
		programId,
		rdpcUrl,
		fetchVC,
		config,
		donorIdsToFilterBy,
		AnalysisType.VARIANT_PROCESSING,
	);

	// contains 1 field: alignmentFirstPublishedDate
	const rdpcInfo_alignmentDate = await getSeqAlignSpecimenData(
		programId,
		rdpcUrl,
		AnalysisType.SEQ_ALIGNMENT,
		analysesWithSpecimensFetcher,
		config,
		donorIdsToFilterBy,
	);

	// contains 3 fields:
	// alignmentsCompleted, alignmentsRunning, alignmentsFailed
	const rdpcInfoByDonor_alignment = await getAlignmentData(
		programId,
		rdpcUrl,
		AnalysisType.SEQ_EXPERIMENT,
		WorkflowName.ALIGNMENT,
		analysesFetcher,
		config,
		false,
		donorIdsToFilterBy,
	);

	// contains 3 fields:
	// sangerVcsCompleted, sangerVcsRunning, sangerVcsFailed
	const rdpcInfoByDonor_sanger = await getSangerData(
		programId,
		rdpcUrl,
		AnalysisType.SEQ_ALIGNMENT,
		WorkflowName.SANGER,
		analysesFetcher,
		config,
		false,
		donorIdsToFilterBy,
	);

	// contains 3 fields:
	// mutectCompleted, mutectRunning, mutectFailed
	const rdpcInfoByDonor_mutect = await getMutectData(
		programId,
		rdpcUrl,
		AnalysisType.SEQ_ALIGNMENT,
		WorkflowName.MUTECT,
		analysesFetcher,
		config,
		false,
		donorIdsToFilterBy,
	);

	// contains 3 fields:
	// openAccessCompleted, openAccessRunning, openAccessFailed
	const rdpcInfoByDonor_openAccess = await getOpenAccessData(
		programId,
		rdpcUrl,
		AnalysisType.VARIANT_CALLING,
		WorkflowName.OPEN_ACCESS,
		analysesFetcher,
		config,
		false,
		donorIdsToFilterBy,
	);

	// RNA fields: rnaAlignmentsCompleted, rnaAlignmentsRunning, rnaAlignmentFailed
	const rdpcInfoByDonor_rnaAlignment = await getAlignmentData(
		programId,
		rdpcUrl,
		AnalysisType.SEQ_EXPERIMENT,
		WorkflowName.ALIGNMENT,
		analysesFetcher,
		config,
		true,
		donorIdsToFilterBy,
	);

	/**  ---------- merge DonorInfoMap --------- */
	const donorInfo_alignmentAndVC = mergeDonorInfo(
		rdpcInfoByDonor_alignment,
		rdpcInfoByDonor_sanger,
	);

	const donorInfo = mergeDonorInfo(donorInfo_alignmentAndVC, rdpcInfoByDonor_specimens);

	const donorInfo_dna_data = mergeDonorInfo(donorInfo, rdpcInfoByDonor_mutect);

	const donorInfo_dna_dates = mergeDonorInfo(donorInfo_dna_data, rdpcInfo_alignmentDate);

	const rdpcDocsMap = mergeDonorInfo(donorInfo_dna_dates, rdpcInfoByDonor_sangerMutectDates);

	const rdpcDocsMap_openAccess = mergeDonorInfo(rdpcDocsMap, rdpcInfoByDonor_openAccess);

	const rdpcDocsMap_openAccessDates = mergeDonorInfo(
		rdpcDocsMap_openAccess,
		rdpcInfoByDonor_openAccessDate,
	);

	const rdpcDocsMap_RnaAlignment = mergeDonorInfo(
		rdpcDocsMap_openAccessDates,
		rdpcInfoByDonor_rnaAlignment,
	);
	/**  ---------- End of merge DonorInfoMap --------- */

	// get existing ES donors from the previous index, because we only want to index RDPC donors that
	// have already been registered in clinical.
	const donorIds = Object.keys(rdpcDocsMap_RnaAlignment);
	const esHits = await queryDocumentsByDonorIds(donorIds, esClient, targetIndexName);

	const donorIdDocumentPairs = esHits.map((hit) => [hit._source.donorId, hit] as [string, EsHit]);

	const preExistingDonorHits = Object.fromEntries(donorIdDocumentPairs);

	const esDocuments = Object.entries(preExistingDonorHits).map(([donorId, esHit]) => {
		const newRdpcInfo = rdpcDocsMap_RnaAlignment[donorId];
		return convertToEsDocument(esHit._source, newRdpcInfo);
	});

	if (esDocuments.length) {
		logger.info(`Begin bulk indexing donors of program ${programId}...`);

		await esClient.bulk({
			body: toEsBulkIndexActions<EsDonorDocument>(
				targetIndexName,
				(donor) => preExistingDonorHits[donor.donorId]?._id || donor.donorId,
			)(esDocuments),
			refresh: 'wait_for',
		});

		logger.info(
			`Successfully indexed all donors of program ${programId} to index: ${targetIndexName}`,
		);
	} else {
		logger.warn(`No document to index for program ${programId}`);
	}
};
