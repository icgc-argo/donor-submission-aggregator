import fetch from "node-fetch";
import {
  Run,
  DonorDocMap,
  Analysis,
  DonorRunStateMap,
  SessionRunMap,
} from "./types";
import _ from "lodash";
import logger from "logger";
import promiseRetry from "promise-retry";

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
        sessionId
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

const retryConfig = {
  factor: 2,
  retries: 5,
  minTimeout: 1000,
  maxTimeout: Infinity,
};

export const fetchSeqExpAnalyses = async (
  studyId: string,
  url: string,
  from: number,
  size: number
): Promise<Analysis[]> => {
  const query = buildQuery(studyId, from, size);

  return await promiseRetry<Analysis[]>(async (retry) => {
    try {
      logger.info("Fetching sequencing experiment analyses from rdpc.....");
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: {
          "Content-type": "application/json",
        },
      });
      return (await response.json()).data
        .SequencingExperimentAnalyses as Analysis[];
    } catch (err) {
      logger.warn(
        `Failed to fetch sequencing experiment analyses: ${err}, retrying...`
      );
      return retry(err);
    }
  }, retryConfig).catch((err) => {
    logger.error(
      `Failed to fetch sequencing experiment analyses of program: ${studyId} from RDPC ${url} after ${retryConfig.retries} attempts: ${err}`
    );
    throw err;
  });
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
 * Extracts donor-run relation from analysis, this is done by the following steps:
 * Creates session-run map for each donor by grouping runs by sessionId,
 * creates donor-session-run map by determining the latest run for each session,
 * aggregates donor-session-run map by donor id.
 * @param analyses RDPC analysis array
 */
export const toDonorCentric = (analyses: Analysis[]): DonorDocMap => {
  const result = analyses.reduce<DonorDocMap>((acc, analysis) => {
    const donorWithLatestRun = analysis.donors.reduce<DonorDocMap>(
      (_acc, donor) => {
        const sessionMap = _(analysis.runs)
          .groupBy("sessionId")
          .value() as SessionRunMap;

        Object.entries(sessionMap).forEach(([sessionId, runs]) => {
          const latestRun = getLatestRun(runs);
          const run = latestRun === undefined ? [] : [latestRun];
          const existingSessionMap = _acc[donor.donorId];
          _acc[donor.donorId] = {
            ...existingSessionMap,
            [sessionId]: run,
          };
        });

        return _acc;
      },
      {}
    );

    // merge donor-session-run map by donorId, in case same donors appear under multiple analyses
    Object.entries(donorWithLatestRun).forEach(([donorId, sessionMap]) => {
      const existingSessionMap = acc[donorId] ? acc[donorId] : {};
      acc[donorId] = {
        ...sessionMap,
        ...existingSessionMap,
      };
    });

    return acc;
  }, {});

  return result;
};

const getLatestRun = (runs: Run[]): Run | undefined => {
  return _(runs)
    .sortBy(
      (run) =>
        (({ COMPLETE: 1, RUNNING: 2, EXECUTOR_ERROR: 3 } as {
          [k: string]: number;
        })[run.state])
    )
    .head();
};

export const mergeDonorMaps = (
  mergedMap: DonorDocMap,
  toMerge: DonorDocMap
): DonorDocMap => {
  Object.entries(toMerge).forEach(([donorId, sessionMap]) => {
    const existingSessionMap = mergedMap[donorId] ? mergedMap[donorId] : {};
    const mergedSessionMap = {
      ...existingSessionMap,
      ...sessionMap,
    };
    mergedMap[donorId] = { ...mergedSessionMap };
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
  let mergedDonorsWithAlignmentRuns: DonorDocMap = {};

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
  Object.entries(donorMap).forEach(([donorId, sessionMap]) => {
    Object.entries(sessionMap).forEach(([sessionId, runs]) => {
      runs.forEach((run) => {
        if (run.state === "COMPLETE") {
          if (result[donorId]) {
            result[donorId].alignmentsCompleted += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].alignmentsCompleted += 1;
          }
        }

        if (run.state === "RUNNING") {
          if (result[donorId]) {
            result[donorId].alignmentsRunning += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].alignmentsRunning += 1;
          }
        }

        if (run.state === "EXECUTOR_ERROR") {
          if (result[donorId]) {
            result[donorId].alignmentsFailed += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].alignmentsFailed += 1;
          }
        }
      });
    });
  });

  return result;
};

const initializeRdpcInfo = (
  result: DonorRunStateMap,
  donorId: string
): void => {
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
