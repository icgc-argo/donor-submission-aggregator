import fetch from "node-fetch";
import { Run, DonorDocMap, Analysis, DonorRunStateMap } from "./types";
import _ from "lodash";
import logger from "logger";

const buildQuery = (studyId: string, from: number, size: number): string => {
  const query = `
  fragment AnalysisData on Analysis {
    analysisId
    analysisType
    studyId
    donors {
      donorId
    }
  }

  query {
    SequencingExperimentAnalyses: analyses(
      filter: {
        analysisType: "sequencing_experiment"
        studyId: "${studyId}"
      },
      page: {from: ${from}, size: ${size}}
    ) {
      ...AnalysisData
      runs: inputForRuns {
        runId
        state
        repository
        inputAnalyses {
          analysisId
        }
      }
    }
  }
  `;

  return query;
};

export const fetchSeqExpAnalyses = async (
  studyId: string,
  url: string,
  from: number,
  size: number
): Promise<Analysis[]> => {
  const query = buildQuery(studyId, from, size);
  try {
    logger.info("Fetching analyses from rdpc.....");
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ query }),
      headers: {
        "Content-type": "application/json",
      },
    });

    const responseData = await response.json();
    let result = [new Analysis()];

    if (responseData && responseData.data) {
      const data = responseData.data;
      if (data.SequencingExperimentAnalyses) {
        result = data.SequencingExperimentAnalyses as Analysis[];
      }
      return result;
    } else {
      throw Error("Failed to fetch RDPC data, no response data.");
    }
  } catch (error) {
    return error.message;
  }
};

type StreamState = {
  currentPage: number;
};

export const analysisStream = async function* (
  studyId: string,
  url: string,
  config?: {
    chunkSize?: number;
    state?: StreamState;
  }
): AsyncGenerator<Analysis[]> {
  const chunkSize = config?.chunkSize || 1000;
  const streamState: StreamState = {
    currentPage: config?.state?.currentPage || 0,
  };
  while (true) {
    const page = await fetchSeqExpAnalyses(
      studyId,
      url,
      streamState.currentPage,
      chunkSize
    );
    streamState.currentPage = streamState.currentPage + chunkSize;

    if (page && page.length > 0) {
      yield page;
    } else {
      break;
    }
  }
};

/**
 * transforms analyses data to donor centric map.
 * @param analyses Analysis array
 */
export const toDonorCentric = (analyses: Analysis[]): DonorDocMap => {
  const result = analyses.reduce<DonorDocMap>((acc, analysis) => {
    const reducedDonors_1 = analysis.donors.reduce<DonorDocMap>(
      (_acc, donor) => {
        const existingRuns = _acc[donor.donorId]
          ? _acc[donor.donorId].runs
          : [];
        const mergedRuns = _.union([...existingRuns], [...analysis.runs]);

        const latestRun = getLatestRun(mergedRuns);
        _acc[donor.donorId] = {
          ...donor,
          runs: latestRun,
        };
        return _acc;
      },
      {}
    );

    Object.entries(reducedDonors_1).forEach(([donorId, donorDoc]) => {
      const existingRuns = acc[donorId] ? acc[donorId].runs : [];
      const mergedRuns = _.union(existingRuns, donorDoc.runs);
      acc[donorId] = {
        ...acc[donorId],
        ...donorDoc,
        runs: mergedRuns,
      };
    });

    return acc;
  }, {});

  return result;
};

const getLatestRun = (runs: Run[]): Run[] => {
  // If there is only 1 run, it must be the latest run:
  if (runs.length == 1) {
    return runs;
  }

  let latestRun = new Run();
  latestRun.state = "EXECUTOR_ERROR";
  let stateMap = new Map<String, Run>();
  runs.forEach((run) => {
    stateMap.set(run.state, run);
  });

  // determine the latest run state:
  for (const entry of stateMap.entries()) {
    if (entry[0] === "COMPLETE") {
      latestRun = entry[1];
      return [latestRun];
    } else if (entry[0] === "RUNNING") {
      latestRun = entry[1];
    } else {
      if (latestRun.state === "EXECUTOR_ERROR") {
        latestRun = entry[1];
      }
    }
  }
  return [latestRun];
};

export const mergeDonorMaps = (
  mergedMap: DonorDocMap,
  toMerge: DonorDocMap
): DonorDocMap => {
  Object.entries(toMerge).forEach(([donorId, donorDoc]) => {
    const existingRuns = mergedMap[donorId] ? mergedMap[donorId].runs : [];
    const mergedRuns = _.union(existingRuns, toMerge[donorId].runs);

    mergedMap[donorId] = {
      donorId: donorId,
      runs: mergedRuns,
    };
  });
  return mergedMap;
};

export const getAllMergedDonor = async (
  studyId: string,
  url: string,
  config?: {
    chunkSize?: number;
    state?: StreamState;
  }
): Promise<DonorDocMap> => {
  const stream = analysisStream(studyId, url, config);
  let mergedDonorsWithAlignmentRuns = new DonorDocMap();

  for await (const page of stream) {
    logger.info(`Streaming ${page.length} sequencing experiment analyses...`);
    const donorPerPage = toDonorCentric(page);
    mergedDonorsWithAlignmentRuns = mergeDonorMaps(
      mergedDonorsWithAlignmentRuns,
      donorPerPage
    );
  }
  return mergedDonorsWithAlignmentRuns;
};

export const donorStateMap = (donorMap: DonorDocMap): DonorRunStateMap => {
  let result: DonorRunStateMap = {};
  Object.entries(donorMap).forEach(([donorId, donor]) => {
    donor.runs.forEach((run) => {
      if (run.state === "COMPLETE") {
        if (result[donorId]) {
          result[donorId].alignmentsCompleted += 1;
        } else {
          initializeEntry(result, donorId);
          result[donorId].alignmentsCompleted += 1;
        }
      }

      if (run.state === "RUNNING") {
        if (result[donorId]) {
          result[donorId].alignmentsRunning += 1;
        } else {
          initializeEntry(result, donorId);
          result[donorId].alignmentsRunning += 1;
        }
      }

      if (run.state === "EXECUTOR_ERROR") {
        if (result[donorId]) {
          result[donorId].alignmentsFailed += 1;
        } else {
          initializeEntry(result, donorId);
          result[donorId].alignmentsFailed += 1;
        }
      }
    });
  });
  return result;
};

const initializeEntry = (result: DonorRunStateMap, donorId: string): void => {
  result[donorId] = {
    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,
    alignmentsCompleted: 0,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: "NO_RELEASE",
    processingStatus: "REGISTERED",
  };
};
