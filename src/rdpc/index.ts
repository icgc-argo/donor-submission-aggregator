import { donorStateMap, getAllMergedDonor } from "./analysesProcessor";
import { STREAM_CHUNK_SIZE } from "config";
import { queryDocumentsByDonorIds } from "indexClinicalData";
import { Client } from "@elastic/elasticsearch";
import { EsDonorDocument, EsHit, RdpcDonorInfo } from "indexClinicalData/types";
import { toEsBulkIndexActions } from "elasticsearch";
import logger from "logger";

const convertToEsDocument = (
  rdpcInfo: RdpcDonorInfo,
  donorId: string,
  programId: string,
  existingEsHits?: EsDonorDocument
): EsDonorDocument => {
  if (existingEsHits) {
    return { ...existingEsHits, ...rdpcInfo };
  } else {
    return {
      ...rdpcInfo,
      submittedCoreDataPercent: 0,
      submittedExtendedDataPercent: 0,
      validWithCurrentDictionary: false,
      donorId: donorId,
      submitterDonorId: "",
      programId: programId,
      registeredNormalSamples: 0,
      registeredTumourSamples: 0,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  }
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

  const esDocuments = Object.entries(rdpcDocsMap).map(([donorId, rdpcInfo]) => {
    if (preExistingDonorHits.hasOwnProperty(donorId)) {
      return convertToEsDocument(
        rdpcInfo,
        donorId,
        programId,
        preExistingDonorHits[donorId]._source
      );
    } else {
      return convertToEsDocument(rdpcInfo, donorId, programId);
    }
  });

  await esClient.bulk({
    body: toEsBulkIndexActions<EsDonorDocument>(
      targetIndexName,
      (donor) => preExistingDonorHits[donor.donorId]?._id
    )(esDocuments),
    refresh: "true",
  });
};
