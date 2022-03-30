import { esDonorId } from "./utils";
import transformToEsDonor from "./transformToEsDonor";
import * as Clinical from "../external/clinical";
import { toEsBulkIndexActions } from "external/elasticsearch";
import { STREAM_CHUNK_SIZE } from "config";
import { Client } from "@elastic/elasticsearch";
import logger from "logger";
import { EsDonorDocument, EsHit } from "./types";
import esb from "elastic-builder";

export const queryDocumentsByDonorIds = async (
  donorIds: Array<string>,
  client: Client,
  indexName: string
): Promise<EsHit[]> => {
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
  const donorStream = Clinical.fetchAllDonorsForProgram(programShortName);
  let donorCount = 0;
  for await (const donor of donorStream) {
    const esHits = await queryDocumentsByDonorIds(
      [donor.donorId],
      esClient,
      targetIndexName
    );

    const donorIdDocumentPairs = esHits.map(
      (hit) => [hit._source.donorId, hit] as [string, EsHit]
    );

    // converts index array to a map
    const preExistingDonorHits = Object.fromEntries(donorIdDocumentPairs);

    const esDocuments = preExistingDonorHits.hasOwnProperty(donor.donorId)
      ? transformToEsDonor(donor, preExistingDonorHits[donor.donorId]._source)
      : transformToEsDonor(donor);

    try {
      await esClient.bulk({
        body: toEsBulkIndexActions<EsDonorDocument>(
          targetIndexName,
          (donor) => preExistingDonorHits[donor.donorId]?._id || donor.donorId
        )([esDocuments]),
        refresh: "true",
      });
      donorCount++;
    } catch (error) {
      logger.error(`Error indexing clinical data --- ${JSON.stringify(error)}`);
      logger.error(error);
    }
  }
  logger.info(
    `Indexed Clinical Data for ${donorCount} donors for program ${programShortName}`
  );
};
