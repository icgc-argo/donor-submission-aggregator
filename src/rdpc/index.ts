import {
  samplePairToDonorInfo,
  countAlignmentRunState,
  countMutectRunState,
  countSpecimenType,
  countVCRunState,
  getAllMergedDonor,
  getAllMergedDonorWithSpecimens,
  mergeDonorInfo,
} from "./analysesProcessor";
import { STREAM_CHUNK_SIZE } from "config";
import { queryDocumentsByDonorIds } from "indexClinicalData";
import { Client } from "@elastic/elasticsearch";
import { EsDonorDocument, EsHit, RdpcDonorInfo } from "indexClinicalData/types";
import { toEsBulkIndexActions } from "elasticsearch";
import logger from "logger";
import fetchAnalyses from "./fetchAnalyses";
import fetchDonorIdsByAnalysis from "./fetchDonorIdsByAnalysis";
import { EgoJwtManager } from "auth";
import fetchAnalysesWithSpecimens from "./fetchAnalysesWithSpecimens";
import {
  findEarliestAvailableSamplePair,
  findMatchedTNPairs,
} from "./findMatchedTNPairs";
import { AnalysisType } from "./types";

const convertToEsDocument = (
  existingEsHit: EsDonorDocument,
  rdpcInfo?: RdpcDonorInfo
): EsDonorDocument => {
  existingEsHit.updatedAt = new Date();
  return { ...existingEsHit, ...rdpcInfo };
};

export const indexRdpcData = async ({
  programId,
  rdpcUrl,
  targetIndexName,
  esClient,
  egoJwtManager,
  analysesFetcher = fetchAnalyses,
  analysesWithSpecimensFetcher = fetchAnalysesWithSpecimens,
  fetchDonorIds = fetchDonorIdsByAnalysis,
  analysisId,
}: {
  programId: string;
  rdpcUrl: string;
  targetIndexName: string;
  esClient: Client;
  egoJwtManager: EgoJwtManager;
  analysesFetcher?: typeof fetchAnalyses; // optional only for test
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
        egoJwtManager,
      })
    : undefined;

  const mergedDonorDataMap = await getAllMergedDonorWithSpecimens({
    studyId: programId,
    url: rdpcUrl,
    egoJwtManager,
    donorIds: donorIdsToFilterBy,
    config: config,
    analysesFetcher: analysesWithSpecimensFetcher,
  });

  const mergedAlignmentDonors = await getAllMergedDonor({
    studyId: programId,
    url: rdpcUrl,
    donorIds: donorIdsToFilterBy,
    analysisType: AnalysisType.SEQ_EXPERIMENT,
    isMutect: false,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const mergedVCDonors = await getAllMergedDonor({
    studyId: programId,
    url: rdpcUrl,
    donorIds: donorIdsToFilterBy,
    analysisType: AnalysisType.SEQ_ALIGNMENT,
    isMutect: false,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const mergedMutectDonors = await getAllMergedDonor({
    studyId: programId,
    url: rdpcUrl,
    donorIds: donorIdsToFilterBy,
    analysisType: AnalysisType.SEQ_ALIGNMENT,
    isMutect: true,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor_alignment = countAlignmentRunState(
    mergedAlignmentDonors
  );

  const rdpcInfoByDonor_VC = countVCRunState(mergedVCDonors);

  const rdpcInfoByDonor_specimens = countSpecimenType(mergedDonorDataMap);

  const donorsWithMatchedSamplePairs = findMatchedTNPairs(mergedDonorDataMap);

  const donorsWithEarliestPair = findEarliestAvailableSamplePair(
    donorsWithMatchedSamplePairs
  );

  const rdpcInfo_rawReadsDate = samplePairToDonorInfo(donorsWithEarliestPair);

  const rdpcInfoByDonor_mutect = countMutectRunState(mergedMutectDonors);

  const donorInfo_alignmentAndVC = mergeDonorInfo(
    rdpcInfoByDonor_alignment,
    rdpcInfoByDonor_VC
  );

  const donorInfo = mergeDonorInfo(
    donorInfo_alignmentAndVC,
    rdpcInfoByDonor_specimens
  );

  const donorInfo_dna_data = mergeDonorInfo(donorInfo, rdpcInfoByDonor_mutect);

  const rdpcDocsMap = mergeDonorInfo(donorInfo_dna_data, rdpcInfo_rawReadsDate);

  // get existing ES donors from the previous index, because we only want to index RDPC donors that
  // have already been registered in clinical.
  const donorIds = Object.keys(rdpcDocsMap);
  const esHits = await queryDocumentsByDonorIds(
    donorIds,
    esClient,
    targetIndexName
  );

  const donorIdDocumentPairs = esHits.map(
    (hit) => [hit._source.donorId, hit] as [string, EsHit]
  );

  const preExistingDonorHits = Object.fromEntries(donorIdDocumentPairs);

  const esDocuments = Object.entries(preExistingDonorHits).map(
    ([donorId, esHit]) => {
      const newRdpcInfo = rdpcDocsMap[donorId];
      return convertToEsDocument(esHit._source, newRdpcInfo);
    }
  );

  if (esDocuments.length) {
    logger.info(`Begin bulk indexing donors of program ${programId}...`);

    await esClient.bulk({
      body: toEsBulkIndexActions<EsDonorDocument>(
        targetIndexName,
        (donor) => preExistingDonorHits[donor.donorId]?._id
      )(esDocuments),
      refresh: "wait_for",
    });

    logger.info(
      `Successfully indexed all donors of program ${programId} to index: ${targetIndexName}`
    );
  } else {
    logger.warn(`No document to index for program ${programId}`);
  }
};
