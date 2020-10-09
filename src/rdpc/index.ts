import { donorStateMap, getAllMergedDonor } from "./analysesProcessor";
import { STREAM_CHUNK_SIZE } from "config";
import { queryDocumentsByDonorIds } from "indexClinicalData";
import { Client } from "@elastic/elasticsearch";

export const indexRdpcData = async (
  programId: string,
  rdpcUrl: string,
  targetIndexName: string,
  esClient: Client
) => {
  console.log(`Processing program ${programId} from ${rdpcUrl}.`);
  const config = { chunkSize: STREAM_CHUNK_SIZE };
  const mergedDonors = await getAllMergedDonor(programId, config);

  const rdpcDocsMap = donorStateMap(mergedDonors);

  // get existing ES donors:
  const donorIds = Object.keys(rdpcDocsMap);
  const esHits = await queryDocumentsByDonorIds(
    donorIds,
    esClient,
    targetIndexName
  );
};
