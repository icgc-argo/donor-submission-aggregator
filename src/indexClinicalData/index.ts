import { esDonorId } from "./utils";
import transformToEsDonor from "./transformToEsDonor";
import programDonorStream from "./programDonorStream";
import { toEsBulkIndexActions } from "elasticsearch";
import { STREAM_CHUNK_SIZE } from "config";
import { Client } from "@elastic/elasticsearch";
import logger from "logger";
import { EsDonorDocument, EsHit } from "./types";
import esb from "elastic-builder";

export const queryDocumentsByDonorIds = async (
  donorIds: Array<string>,
  client: Client,
  indexName: string
) => {
  const esQuery = esb
    .requestBodySearch()
    .size(donorIds.length)
    .query(esb.termsQuery("donorId", donorIds));

  const esHits: Array<EsHit> = await client
    .search({
      index: indexName,
      body: esQuery,
    })
    .then((res) => res.body.hits.hits)
    .catch((err) => {
      logger.error("error in grabbing donors by id from Elasticsearch: ", err);
      return [];
    });

  return esHits;
};

export default async (
  programShortName: string,
  targetIndexName: string,
  esClient: Client
) => {
  const donorStream = programDonorStream(programShortName, {
    chunkSize: STREAM_CHUNK_SIZE,
  });
  let chunksCount = 0;
  for await (const chunk of donorStream) {
    const timer = `streaming ${
      chunk.length
    } donor(s) from chunk #${chunksCount++} of program ${programShortName}`;
    logger.profile(timer);

    const esHits = await queryDocumentsByDonorIds(
      chunk.map(esDonorId),
      esClient,
      targetIndexName
    );

    // transfer to a index array
    const donorIdDocumentPairs = esHits.map(
      (hit) => [hit._source.donorId, hit] as [string, EsHit]
    );

    // convets index array to a map
    const preExistingDonorHits = Object.fromEntries(donorIdDocumentPairs);

    const esDocuments = chunk.map((donor) => {
      const donorId = esDonorId(donor);
      if (preExistingDonorHits.hasOwnProperty(donorId)) {
        return transformToEsDonor(donor, preExistingDonorHits[donorId]._source);
      } else return transformToEsDonor(donor);
    });

    await esClient.bulk({
      body: toEsBulkIndexActions<EsDonorDocument>(
        targetIndexName,
        (donor) => preExistingDonorHits[donor.donorId]?._id
      )(esDocuments),
      refresh: "true",
    });
    logger.profile(timer);
  }
};
