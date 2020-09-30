import { fetchRDPC, workflowStream, indexRdpc } from "./index";
import { STREAM_CHUNK_SIZE } from "config";

async () => {
  const config = { chunkSize: 10 };
  const data = await fetchRDPC(0, 10);
  // const data = workflowStream(config);
  // const data = await fetchRDPC(0, 100);
  console.log(data);

  // cache and transform data
};
