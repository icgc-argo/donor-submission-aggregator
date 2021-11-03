import { Client } from "@elastic/elasticsearch";
import { EgoJwtManager } from "auth";
import { toEsBulkIndexActions } from "elasticsearch";
import { queryDocumentsByDonorIds } from "indexClinicalData";
import { EsDonorDocument, EsHit } from "indexClinicalData/types";
import logger from "logger";
import { convertToEsDocument } from "rdpc";
import { determineReleaseStatus } from "./filesProcessor";
import { getFilesByProgramId } from "./getFilesByProgramId";

export const indexFileData = async (
  programId: string,
  egoJwtManager: EgoJwtManager,
  fetchFileData: typeof getFilesByProgramId,
  targetIndexName: string,
  esClient: Client,
  donorsUpdated?: string[]
) => {
  const donorFileInfo = await determineReleaseStatus(
    programId,
    egoJwtManager,
    fetchFileData,
    donorsUpdated
  );

  const donorIds = Object.keys(donorFileInfo);
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
      const newRdpcInfo = donorFileInfo[donorId];
      return convertToEsDocument(esHit._source, newRdpcInfo);
    }
  );

  if (esDocuments.length) {
    logger.info(
      `Begin bulk indexing donor file data of program ${programId}...`
    );

    await esClient.bulk({
      body: toEsBulkIndexActions<EsDonorDocument>(
        targetIndexName,
        (donor) => preExistingDonorHits[donor.donorId]?._id
      )(esDocuments),
      refresh: "wait_for",
    });

    logger.info(
      `Successfully indexed donor file data of program ${programId} to index: ${targetIndexName}`
    );
  } else {
    logger.warn(`No document to index for program ${programId}`);
  }
};
