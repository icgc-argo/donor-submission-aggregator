import transformToEsDonor from "./transformToEsDonor";
import programDonorStream from "./programDonorStream";
import rollCall from "rollCall";
import {
  esClient,
  initIndexMappping,
  toEsBulkIndexActions
} from "elasticsearch";
import { toJson } from "donorModel";

export default async (programShortName: string, targetIndexName: string) => {
  const donorStream = programDonorStream(programShortName, {
    chunkSize: 1000
  });
  let chunksCount = 0;
  for await (const chunk of donorStream) {
    const timer = `streaming chunk #${chunksCount++} of program ${programShortName}`;
    console.time(timer);
    if (chunk.length) {
      const esDocuments = await Promise.all(
        chunk.map(toJson).map(transformToEsDonor)
      );
      await esClient.bulk({
        body: toEsBulkIndexActions(targetIndexName)(esDocuments),
        refresh: "true"
      });
    }
    console.timeEnd(timer);
  }
};
