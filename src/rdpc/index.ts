import fetch from "node-fetch";
import { Runs, Run, DonorDocMap, Donor, DonorDoc, SimpleRun } from "./types";
import logger from "logger";
import _ from "lodash";

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

/**
 * transforms run centric rdpc data to donor centric data.
 * @param runs runs array
 */
export const toDonorCentric = (runs: Run[]): DonorDocMap => {
  const result = runs.reduce<DonorDocMap>((acc, run) => {
    const donorsForCurrentRun = run.inputAnalyses.map(
      (analysis: { donors: Donor[] }) => {
        return analysis.donors.map((donor) => {
          return {
            donorId: donor.donorId,
            runs: [run],
          };
        });
      }
    );

    console.log(
      "donorsForCurrentRun ----" + JSON.stringify(donorsForCurrentRun)
    );

    const flattenedDonors = donorsForCurrentRun.reduce<DonorDoc[]>(
      (_acc, donors) => {
        // const withoutAnalyses = donors.reduce(
        //   (_acc, donor) => {
        //     donor.runs.map(run => {

        //     })
        //     return donor;
        //   }, []);

        return [..._acc, ...donors];
      },
      []
    );

    console.log(
      "flattenedDonors donors ====== " + JSON.stringify(flattenedDonors)
    );

    const furtherReduced = flattenedDonors.reduce<{ [key: string]: DonorDoc }>(
      (_acc, donor) => {
        const previousRuns = _acc[donor.donorId]
          ? _acc[donor.donorId].runs
          : [];
        _acc[donor.donorId] = {
          ...donor,
          runs: _.union([...previousRuns, ...donor.runs]),
        };
        return _acc;
      },
      {}
    );

    console.log("Further reduced: ----- " + JSON.stringify(furtherReduced));

    // merge acc with furtherReduced:
    Object.entries(furtherReduced).forEach(([key, donorDoc]) => {
      const previouslyRecordedRuns = acc[key] ? acc[key].runs : [];

      const mergedRuns = _.union(previouslyRecordedRuns, donorDoc.runs);

      acc[key] = {
        ...donorDoc,
        ...acc[key],
        runs: mergedRuns,
      };
    });

    return acc;
  }, {});

  return result;
};

export const indexRdpc = () => {};

export default fetchRDPC;
