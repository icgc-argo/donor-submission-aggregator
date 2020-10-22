import { donorStateMap, getAllMergedDonor } from "./analysesProcessor";
import { STREAM_CHUNK_SIZE } from "config";
import { queryDocumentsByDonorIds } from "indexClinicalData";
import { Client } from "@elastic/elasticsearch";
import { EsDonorDocument, EsHit, RdpcDonorInfo } from "indexClinicalData/types";
import { toEsBulkIndexActions } from "elasticsearch";
import logger from "logger";

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
  esClient: Client
) => {
  logger.info(`Processing program: ${programId} from ${rdpcUrl}.`);

  const config = { chunkSize: STREAM_CHUNK_SIZE };
  const mergedDonors = await getAllMergedDonor(programId, rdpcUrl, config);

  const rdpcDocsMap = donorStateMap(mergedDonors);

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

  logger.info(`Begin indexing program ${programId}...`);

  await esClient.bulk({
    body: toEsBulkIndexActions<EsDonorDocument>(
      targetIndexName,
      (donor) => preExistingDonorHits[donor.donorId]?._id
    )(esDocuments),
    refresh: "true",
  });

  logger.info(`Successfully indexed program ${programId}.`);
};
