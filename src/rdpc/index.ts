import fetch from "node-fetch";
import { Runs, Run } from "./types";
import logger from "logger";

const url = "https://api.rdpc-qa.cancercollaboratory.org/graphql";

const buildQuery = (from: number, size: number): string => {
  const query = `
  query {
      runs(
        filter: {
          repository: "https://github.com/icgc-argo/sanger-wgs-variant-calling.git"
        }, page: {from: ${from}, size: ${size}}
      ){
        runId
        state
        repository
        inputAnalyses{
          analysisId
          analysisType
          donors{
            donorId
          }
        }
      }
    }`;
  return query;
};

export const fetchRDPC = async (from: number, size: number): Promise<Runs> => {
  const query = buildQuery(from, size);
  try {
    // logger.info("Fetching data from rdpc.....");
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ query }),
      headers: {
        "Content-type": "application/json",
      },
    });

    const respnseData = await response.json();
    let data;
    if (respnseData) {
      data = respnseData.data as Runs;
    } else {
      throw Error("Failed to fetch RDPC data, no response data.");
    }
    return data;
  } catch (error) {
    return error.message;
  }
};

type StreamState = {
  currentPage: number;
};

export const workflowStream = async function* (config?: {
  chunkSize?: number;
  state?: StreamState;
}): AsyncGenerator<Run[]> {
  const chunkSize = config?.chunkSize || 1000;
  const streamState: StreamState = {
    currentPage: config?.state?.currentPage || 0,
  };
  while (true) {
    const page = await fetchRDPC(streamState.currentPage, chunkSize);
    streamState.currentPage = streamState.currentPage + chunkSize;
    if (page.runs.length > 0) {
      yield page.runs;
    } else {
      break;
    }
  }
};

export const indexRdpc = () => {};

export default fetchRDPC;
