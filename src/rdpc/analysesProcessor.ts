import fetch from "node-fetch";
import {
  Run,
  RunsByAnalysesByDonors,
  Analysis,
  DonorRunStateMap,
  RunsByInputAnalyses,
  RunState,
  AnalysisType,
} from "./types";
import _ from "lodash";
import logger from "logger";
import promiseRetry from "promise-retry";
import HashCode from "ts-hashcode";
import { SANGER_VC_REPO_URL, SEQ_ALIGN_REPO_URL } from "config";

const buildQuery = (
  studyId: string,
  analysisType: string,
  repoUrl: string,
  from: number,
  size: number
): string => {
  const query = `
  fragment AnalysisData on Analysis {
    analysisId
    analysisType
    donors {
      donorId
    }
  }

  query {
    analyses(
      filter: {
        analysisType: "${analysisType}"
        studyId: "${studyId}"
      },
      page: {from: ${from}, size: ${size}}
    ) {
      ...AnalysisData
      runs: inputForRuns(
        filter: {
          repository: "${repoUrl}"
        }
      ) {
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

const retryConfig = {
  factor: 2,
  retries: 5,
  minTimeout: 1000,
  maxTimeout: Infinity,
};

export const fetchAnalyses = async (
  studyId: string,
  rdpcUrl: string,
  workflowRepoUrl: string,
  analysisType: string,
  from: number,
  size: number
): Promise<Analysis[]> => {
  const query = buildQuery(studyId, analysisType, workflowRepoUrl, from, size);

  return await promiseRetry<Analysis[]>(async (retry) => {
    try {
      logger.info(`Fetching ${analysisType} analyses from rdpc.....`);
      const response = await fetch(rdpcUrl, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: {
          "Content-type": "application/json",
        },
      });
      return (await response.json()).data.analyses as Analysis[];
    } catch (err) {
      logger.warn(`Failed to fetch analyses: ${err}, retrying...`);
      return retry(err);
    }
  }, retryConfig).catch((err) => {
    logger.error(
      `Failed to fetch analyses of program: ${studyId} from RDPC ${rdpcUrl} after ${retryConfig.retries} attempts: ${err}`
    );
    throw err;
  });
};

type StreamState = {
  currentPage: number;
};

export const analysisStream = async function* (
  studyId: string,
  rdpcUrl: string,
  analysisType: string,
  config?: {
    chunkSize?: number;
    state?: StreamState;
  }
): AsyncGenerator<Analysis[]> {
  const chunkSize = config?.chunkSize || 1000;
  const streamState: StreamState = {
    currentPage: config?.state?.currentPage || 0,
  };

  let workflowRepoUrl = "";

  if (analysisType === AnalysisType.SEQ_ALIGNMENT) {
    workflowRepoUrl = SANGER_VC_REPO_URL;
  }

  if (analysisType === AnalysisType.SEQ_EXPERIMENT) {
    workflowRepoUrl = SEQ_ALIGN_REPO_URL;
  }

  while (true) {
    const page = await fetchAnalyses(
      studyId,
      rdpcUrl,
      workflowRepoUrl,
      analysisType,
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
 * Creates inputAnalyses-run map for each donor by grouping runs by inputAnalyses,
 * creates donor-inputAnalyses-run map by determining the latest run for each inputAnalyses,
 * aggregates donor-inputAnalyses-run map by donor id.
 * @param analyses RDPC analysis array
 */
export const toDonorCentric = (
  analyses: Analysis[]
): RunsByAnalysesByDonors => {
  const result = analyses.reduce<RunsByAnalysesByDonors>((acc, analysis) => {
    const donorWithLatestRun = analysis.donors.reduce<RunsByAnalysesByDonors>(
      (_acc, donor) => {
        const inputAnalysesMap = _(analysis.runs)
          .groupBy((run) =>
            HashCode(
              _(run.inputAnalyses)
                .map((a) => a.analysisId)
                .orderBy()
                .join("-")
            )
          )
          .value() as RunsByInputAnalyses;

        Object.entries(inputAnalysesMap).forEach(([inputId, runs]) => {
          const latestRun = getLatestRun(runs);
          const run = latestRun === undefined ? [] : [latestRun];
          const existingMap = _acc[donor.donorId];
          _acc[donor.donorId] = {
            ...existingMap,
            [inputId]: run,
          };
        });

        return _acc;
      },
      {}
    );

    // merge donor-inputAnalyses-run map by donorId, in case same donors appear under multiple analyses
    Object.entries(donorWithLatestRun).forEach(
      ([donorId, inputAnalysesMap]) => {
        const existingMap = acc[donorId] ? acc[donorId] : {};
        acc[donorId] = {
          ...inputAnalysesMap,
          ...existingMap,
        };
      }
    );

    return acc;
  }, {});

  return result;
};

export const getLatestRun = (runs: Run[]): Run | undefined => {
  return _(runs)
    .sortBy(
      (run) => ({ COMPLETE: 1, RUNNING: 2, EXECUTOR_ERROR: 3 }[run.state])
    )
    .head();
};

export const getAllRunsByAnalysesByDonors = (
  mergedMap: RunsByAnalysesByDonors,
  toMerge: RunsByAnalysesByDonors
): RunsByAnalysesByDonors => {
  Object.entries(toMerge).forEach(([donorId, inputAnalysesMap]) => {
    const existingMap = mergedMap[donorId] ? mergedMap[donorId] : {};
    const mergedInputAnalysesMap = {
      ...existingMap,
      ...inputAnalysesMap,
    };
    mergedMap[donorId] = mergedInputAnalysesMap;
  });

  return mergedMap;
};

export const getAllMergedDonor = async (
  studyId: string,
  url: string,
  analysisType: string,
  config?: {
    chunkSize?: number;
    state?: StreamState;
  }
): Promise<RunsByAnalysesByDonors> => {
  const stream = analysisStream(studyId, url, analysisType, config);
  let mergedDonors: RunsByAnalysesByDonors = {};

  for await (const page of stream) {
    logger.info(`Streaming ${page.length} of ${analysisType} analyses...`);
    const donorPerPage = toDonorCentric(page);
    getAllRunsByAnalysesByDonors(mergedDonors, donorPerPage);
  }
  return mergedDonors;
};

export const countAlignmentRunState = (
  donorMap: RunsByAnalysesByDonors
): DonorRunStateMap => {
  let result: DonorRunStateMap = {};
  Object.entries(donorMap).forEach(([donorId, map]) => {
    Object.entries(map).forEach(([inputAnalysesId, runs]) => {
      runs.forEach((run) => {
        if (run.state === RunState.COMPLETE) {
          if (result[donorId]) {
            result[donorId].alignmentsCompleted += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].alignmentsCompleted += 1;
          }
        }

        if (run.state === RunState.RUNNING) {
          if (result[donorId]) {
            result[donorId].alignmentsRunning += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].alignmentsRunning += 1;
          }
        }

        if (run.state === RunState.EXECUTOR_ERROR) {
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

export const countVCRunState = (
  donorMap: RunsByAnalysesByDonors
): DonorRunStateMap => {
  let result: DonorRunStateMap = {};
  Object.entries(donorMap).forEach(([donorId, map]) => {
    Object.entries(map).forEach(([inputAnalysesId, runs]) => {
      runs.forEach((run) => {
        if (run.state === RunState.COMPLETE) {
          if (result[donorId]) {
            result[donorId].sangerVcsCompleted += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].sangerVcsCompleted += 1;
          }
        }

        if (run.state === RunState.RUNNING) {
          if (result[donorId]) {
            result[donorId].sangerVcsRunning += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].sangerVcsRunning += 1;
          }
        }

        if (run.state === RunState.EXECUTOR_ERROR) {
          if (result[donorId]) {
            result[donorId].sangerVcsFailed += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].sangerVcsFailed += 1;
          }
        }
      });
    });
  });
  return result;
};

export const initializeRdpcInfo = (
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

export const mergeDonorStateMaps = (
  map: DonorRunStateMap,
  mergeWith: DonorRunStateMap
): DonorRunStateMap => {
  const result = Object.entries(mergeWith).reduce<DonorRunStateMap>(
    (acc, [donorId, rdpcInfo]) => {
      acc[donorId] = {
        publishedNormalAnalysis:
          (acc[donorId]?.publishedNormalAnalysis || 0) +
          rdpcInfo.publishedNormalAnalysis,
        publishedTumourAnalysis:
          (acc[donorId]?.publishedTumourAnalysis || 0) +
          rdpcInfo.publishedTumourAnalysis,
        alignmentsCompleted:
          (acc[donorId]?.alignmentsCompleted || 0) +
          rdpcInfo.alignmentsCompleted,
        alignmentsRunning:
          (acc[donorId]?.alignmentsRunning || 0) + rdpcInfo.alignmentsRunning,
        alignmentsFailed:
          (acc[donorId]?.alignmentsFailed || 0) + rdpcInfo.alignmentsFailed,
        sangerVcsCompleted:
          (acc[donorId]?.sangerVcsCompleted || 0) + rdpcInfo.sangerVcsCompleted,
        sangerVcsRunning:
          (acc[donorId]?.sangerVcsRunning || 0) + rdpcInfo.sangerVcsRunning,
        sangerVcsFailed:
          (acc[donorId]?.sangerVcsFailed || 0) + rdpcInfo.sangerVcsFailed,
        totalFilesCount:
          (acc[donorId]?.totalFilesCount || 0) + rdpcInfo.totalFilesCount,
        filesToQcCount:
          (acc[donorId]?.filesToQcCount || 0) + rdpcInfo.filesToQcCount,
        releaseStatus: "NO_RELEASE",
        processingStatus: "REGISTERED",
      };
      return acc;
    },
    { ...map }
  );
  return result;
};
