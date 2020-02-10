import transformToEsDonor from "./transformToEsDonor";
import programDonorStream from "./programDonorStream";
import {
  esClient as globalEsClient,
  toEsBulkIndexActions
} from "elasticsearch";
import { toJson } from "donorModel";
import { STREAM_CHUNK_SIZE } from "config";
import { Client } from "@elastic/elasticsearch";

export default async (
  programShortName: string,
  targetIndexName: string,
  esClient: Client = globalEsClient
) => {
  const donorStream = programDonorStream(programShortName, {
    chunkSize: STREAM_CHUNK_SIZE
  });
  let chunksCount = 0;
  for await (const chunk of donorStream) {
    const timer = `streaming ${
      chunk.length
    } donor(s) from chunk #${chunksCount++} of program ${programShortName}`;
    console.time(timer);
    const esDocuments = await Promise.all(
      chunk.map(toJson).map(transformToEsDonor)
    );
    await esClient.bulk({
      body: toEsBulkIndexActions(targetIndexName)(esDocuments),
      refresh: "true"
    });
    console.timeEnd(timer);
  }
};
