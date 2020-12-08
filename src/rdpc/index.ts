import {
  countAlignmentRunState,
  countVCRunState,
  getAllMergedDonor,
  mergeDonorStateMaps,
} from "./analysesProcessor";
import { STREAM_CHUNK_SIZE } from "config";
import { queryDocumentsByDonorIds } from "indexClinicalData";
import { Client } from "@elastic/elasticsearch";
import { EsDonorDocument, EsHit, RdpcDonorInfo } from "indexClinicalData/types";
import { toEsBulkIndexActions } from "elasticsearch";
import logger from "logger";
import { AnalysisType } from "./types";
import fetchAnalyses from "./fetchAnalyses";
import fetchDonorIdsByAnalysis from "./fetchDonorIdsByAnalysis";
import { createEgoJwtManager } from "auth";

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
  analysesFetcher = fetchAnalyses,
  fetchDonorIds = fetchDonorIdsByAnalysis,
  analysisId,
}: {
  programId: string;
  rdpcUrl: string;
  targetIndexName: string;
  esClient: Client;
  analysesFetcher?: typeof fetchAnalyses;
  analysisId?: string;
  fetchDonorIds?: typeof fetchDonorIdsByAnalysis;
}) => {
  logger.info(`Processing program: ${programId} from ${rdpcUrl}.`);
  const config = { chunkSize: STREAM_CHUNK_SIZE };

  const jwt = await createEgoJwtManager();
  const accessToken = jwt.access_token;

  const donorIdsToFilterBy = analysisId
    ? await fetchDonorIds({
        rdpcUrl,
        analysisId,
        accessToken,
      })
    : undefined;

  const mergedAlignmentDonors = await getAllMergedDonor({
    studyId: programId,
    url: rdpcUrl,
    donorIds: donorIdsToFilterBy,
    analysisType: AnalysisType.SEQ_EXPERIMENT,
    accessToken,
    config,
    analysesFetcher,
  });

  const mergedVCDonors = await getAllMergedDonor({
    studyId: programId,
    url: rdpcUrl,
    donorIds: donorIdsToFilterBy,
    analysisType: AnalysisType.SEQ_ALIGNMENT,
    accessToken,
    config,
    analysesFetcher,
  });

  const rdpcInfoByDonor_alignment = countAlignmentRunState(
    mergedAlignmentDonors
  );

  const rdpcInfoByDonor_VC = countVCRunState(mergedVCDonors);

  const rdpcDocsMap = mergeDonorStateMaps(
    rdpcInfoByDonor_alignment,
    rdpcInfoByDonor_VC
  );

  // get existing ES donors:
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
