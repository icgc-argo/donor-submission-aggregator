import transformToEsDonor from "./transformToEsDonor";
import programDonorStream from "./programDonorStream";
import { toEsBulkIndexActions } from "elasticsearch";
import { STREAM_CHUNK_SIZE } from "config";
import { Client } from "@elastic/elasticsearch";
import logger from "logger";
import { EsDonorDocument, EsHit } from "./types";
import esb from "elastic-builder";

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

    const donorIds = chunk.map((donor) => `DO${donor.donorId}`);

    const esQuery = esb
      .requestBodySearch()
      .query(esb.termsQuery("donorId", donorIds));

    const esHits: Array<EsHit> = await esClient
      .search({
        // providing an index results in inablity to detect preixsting donors
        //
        // index: targetIndexName,
        body: esQuery,
      })
      .then((res) => res.body.hits.hits)
      .catch((err) => {
        logger.error(
          "error in grabbing donors by id from Elasticsearch: ",
          err
        );
        return [];
      });

    const preExistingDonorIds = esHits.map((hit) => hit._source.donorId);

    const esDocuments: Array<EsDonorDocument> = [];
    for (const donor of chunk) {
      if (preExistingDonorIds.includes(`DO${donor.donorId}`)) {
        // keep all NON donor (mongo doc) data, combine that with the most up to date donor info
        const existingEsDoc = esHits?.find(
          (hit) => hit._source.donorId === `DO${donor.donorId}`
        );
        esDocuments.push(
          await transformToEsDonor(donor, existingEsDoc?._source)
        );
      } else {
        esDocuments.push(await transformToEsDonor(donor));
      }
    }

    await esClient.bulk({
      body: toEsBulkIndexActions(targetIndexName)(esDocuments),
      refresh: "true",
    });
    logger.profile(timer);
  }
};
