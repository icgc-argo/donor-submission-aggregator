import {
  Run,
  RunsByAnalysesByDonors,
  Analysis,
  DonorRunStateMap,
  RunsByInputAnalyses,
  RunState,
  AnalysisType,
} from "./types";
import logger from "logger";
import HashCode from "ts-hashcode";
import { SANGER_VC_REPO_URL, SEQ_ALIGN_REPO_URL } from "config";
import _ from "lodash";
import fetchAnalyses from "rdpc/fetchAnalyses";
import { EgoJwt, getJwt } from "auth";
import egoTokenUtils from "auth/egoTokenUtils";

type StreamState = {
  currentPage: number;
};

export const analysisStream = async function* ({
  studyId,
  rdpcUrl,
  analysisType,
  jwt,
  config,
  analysesFetcher = fetchAnalyses,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  analysisType: string;
  jwt: EgoJwt;
  config?: {
    chunkSize?: number;
  };
  analysesFetcher: typeof fetchAnalyses;
  donorId?: string;
}): AsyncGenerator<Analysis[]> {
  const chunkSize = config?.chunkSize || 1000;
  const streamState: StreamState = {
    currentPage: 0,
  };

  const workflowRepoUrl =
    analysisType === AnalysisType.SEQ_ALIGNMENT
      ? SANGER_VC_REPO_URL
      : SEQ_ALIGN_REPO_URL;

  let accessToken = jwt.getCurrentJwt().access_token;
  const decodedToken = egoTokenUtils.decodeToken(accessToken);
  const expired = egoTokenUtils.isExpiredToken(decodedToken);
  if (expired) {
    accessToken = (await getJwt()).getCurrentJwt().access_token;
  }

  while (true) {
    const page = await analysesFetcher({
      studyId,
      rdpcUrl,
      workflowRepoUrl,
      analysisType,
      from: streamState.currentPage,
      size: chunkSize,
      accessToken,
      donorId,
    });

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

export const getAllMergedDonor = async ({
  analysesFetcher = fetchAnalyses,
  analysisType,
  jwt,
  studyId,
  url,
  config,
  donorIds,
}: {
  studyId: string;
  url: string;
  analysisType: string;
  jwt: EgoJwt;
  donorIds?: string[];
  config?: {
    chunkSize?: number;
    state?: StreamState;
  };
  analysesFetcher: typeof fetchAnalyses;
}): Promise<RunsByAnalysesByDonors> => {
  let mergedDonors: RunsByAnalysesByDonors = {};

  if (donorIds) {
    for (const donorId of donorIds) {
      logger.info(`streaming analyses for donor ${donorId}`);
      const stream = analysisStream({
        studyId,
        rdpcUrl: url,
        analysisType,
        jwt,
        config,
        analysesFetcher,
        donorId,
      });
      for await (const page of stream) {
        logger.info(`Streaming ${page.length} of ${analysisType} analyses...`);
        const donorPerPage = toDonorCentric(page);
        getAllRunsByAnalysesByDonors(mergedDonors, donorPerPage);
      }
    }
  } else {
    const stream = analysisStream({
      studyId,
      rdpcUrl: url,
      analysisType,
      jwt,
      config,
      analysesFetcher,
    });
    for await (const page of stream) {
      logger.info(`Streaming ${page.length} of ${analysisType} analyses...`);
      const donorPerPage = toDonorCentric(page);
      getAllRunsByAnalysesByDonors(mergedDonors, donorPerPage);
    }
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
    _.clone(map)
  );
  return result;
};
