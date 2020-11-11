import {
  countAlignmentRunState,
  countVCRunState,
  fetchAnalyses,
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

const convertToEsDocument = (
  existingEsHit: EsDonorDocument,
  rdpcInfo?: RdpcDonorInfo
): EsDonorDocument => {
  existingEsHit.updatedAt = new Date();
  return { ...existingEsHit, ...rdpcInfo };
};

export const indexRdpcData = async (
  programId: string,
  rdpcUrl: string,
  targetIndexName: string,
  esClient: Client,
  analysisFetcher = fetchAnalyses
) => {
  logger.info(`Processing program: ${programId} from ${rdpcUrl}.`);

  const config = { chunkSize: STREAM_CHUNK_SIZE };

  const mergedAlignmentDonors = await getAllMergedDonor(
    programId,
    rdpcUrl,
    AnalysisType.SEQ_EXPERIMENT,
    config,
    analysisFetcher
  );

  const mergedVCDonors = await getAllMergedDonor(
    programId,
    rdpcUrl,
    AnalysisType.SEQ_ALIGNMENT,
    config,
    analysisFetcher
  );

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

  logger.info(`Begin bulk indexing donors of program ${programId}...`);

  await esClient.bulk(
    {
      body: toEsBulkIndexActions<EsDonorDocument>(
        targetIndexName,
        (donor) => preExistingDonorHits[donor.donorId]?._id
      )(esDocuments),
      refresh: "true",
    },
    (error, response) => {
      if (error) {
        logger.error(response);
      }
    }
  );

  logger.info(
    `Successfully indexed all donors of program ${programId} to index: ${targetIndexName}`
  );
};
