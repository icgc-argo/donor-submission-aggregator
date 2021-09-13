import {
  Run,
  RunsByAnalysesByDonors,
  Analysis,
  DonorInfoMap,
  RunsByInputAnalyses,
  RunState,
  TumourNormalDesignationValue,
  DonorData,
  StringMap,
} from "./types";
import logger from "logger";
import HashCode from "ts-hashcode";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import { EgoJwtManager } from "auth";
import _ from "lodash";
import { RdpcDonorInfo } from "indexClinicalData/types";
import { DonorMolecularDataReleaseStatus } from "files/types";

type StreamState = {
  currentPage: number;
};

export const analysisStream = async function* ({
  studyId,
  rdpcUrl,
  analysisType,
  isMutect,
  egoJwtManager,
  config,
  analysesFetcher = fetchAnalyses,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  analysisType: string;
  isMutect: boolean;
  egoJwtManager: EgoJwtManager;
  config: {
    chunkSize: number;
  };
  analysesFetcher: typeof fetchAnalyses;
  donorId?: string;
}): AsyncGenerator<Analysis[]> {
  const chunkSize = config.chunkSize;
  const streamState: StreamState = {
    currentPage: 0,
  };

  while (true) {
    const page = await analysesFetcher({
      studyId,
      rdpcUrl,
      analysisType,
      isMutect,
      from: streamState.currentPage,
      size: chunkSize,
      egoJwtManager,
      donorId,
    });

    // in case of api returns less analyses than chunk size, we need to stream from the last analysis
    // to make sure there is no data loss:
    streamState.currentPage +=
      page.length < chunkSize ? page.length : chunkSize;

    if (page.length > 0) {
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
  const result = analyses.reduce<RunsByAnalysesByDonors>(
    (runAccWithDuplicateDonors, analysis) => {
      const donorWithLatestRun = analysis.donors.reduce<RunsByAnalysesByDonors>(
        (runAccumulator, donor) => {
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
            const existingMap = runAccumulator[donor.donorId];
            runAccumulator[donor.donorId] = {
              ...existingMap,
              [inputId]: run,
            };
          });

          return runAccumulator;
        },
        {}
      );

      // merge donor-inputAnalyses-run map by donorId, in case same donors appear under multiple analyses
      Object.entries(donorWithLatestRun).forEach(
        ([donorId, inputAnalysesMap]) => {
          const existingMap = runAccWithDuplicateDonors[donorId]
            ? runAccWithDuplicateDonors[donorId]
            : {};
          runAccWithDuplicateDonors[donorId] = {
            ...inputAnalysesMap,
            ...existingMap,
          };
        }
      );

      return runAccWithDuplicateDonors;
    },
    {}
  );

  return result;
};

export const getLatestRun = (runs: Run[]): Run | undefined => {
  return _(runs)
    .sortBy(
      (run) => ({ COMPLETE: 1, RUNNING: 2, EXECUTOR_ERROR: 3 }[run.state])
    )
    .head();
};

/**
 * Merges all pages of donors.
 * @param mergedMap
 * @param toMerge
 */
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
  isMutect,
  egoJwtManager,
  studyId,
  url,
  config,
  donorIds,
}: {
  studyId: string;
  url: string;
  analysisType: string;
  isMutect: boolean;
  egoJwtManager: EgoJwtManager;
  donorIds?: string[];
  config: {
    chunkSize: number;
    state?: StreamState;
  };
  analysesFetcher: typeof fetchAnalyses;
}): Promise<RunsByAnalysesByDonors> => {
  const mergedDonors: RunsByAnalysesByDonors = {};

  if (donorIds) {
    for (const donorId of donorIds) {
      logger.info(`streaming analyses for donor ${donorId}`);
      const stream = analysisStream({
        studyId,
        rdpcUrl: url,
        analysisType,
        isMutect,
        egoJwtManager,
        config,
        analysesFetcher,
        donorId,
      });
      for await (const page of stream) {
        logger.info(`Streaming ${page.length} of ${analysisType} analyses...`);
        const filteredAnalyses = removeCompleteRunsWithSuppressedAnalyses(page);
        const donorPerPage = toDonorCentric(filteredAnalyses);
        getAllRunsByAnalysesByDonors(mergedDonors, donorPerPage);
      }
    }
  } else {
    const stream = analysisStream({
      studyId,
      rdpcUrl: url,
      analysisType,
      isMutect,
      egoJwtManager,
      config,
      analysesFetcher,
    });
    for await (const page of stream) {
      logger.info(`Streaming ${page.length} of ${analysisType} analyses...`);
      const filteredAnalyses = removeCompleteRunsWithSuppressedAnalyses(page);
      const donorPerPage = toDonorCentric(filteredAnalyses);
      getAllRunsByAnalysesByDonors(mergedDonors, donorPerPage);
    }
  }
  return mergedDonors;
};

export const countSpecimenType = (map: StringMap<DonorData>): DonorInfoMap => {
  const result: DonorInfoMap = {};
  Object.entries(map).forEach(([donorId, donorData]) => {
    for (const specimen of donorData.specimen) {
      if (
        specimen.tumourNormalDesignation === TumourNormalDesignationValue.Normal
      ) {
        if (result[donorId]) {
          result[donorId].publishedNormalAnalysis += 1;
        } else {
          initializeRdpcInfo(result, donorId);
          result[donorId].publishedNormalAnalysis += 1;
        }
      }

      if (
        specimen.tumourNormalDesignation === TumourNormalDesignationValue.Tumour
      ) {
        if (result[donorId]) {
          result[donorId].publishedTumourAnalysis += 1;
        } else {
          initializeRdpcInfo(result, donorId);
          result[donorId].publishedTumourAnalysis += 1;
        }
      }
    }
  });
  return result;
};

export const countMutectRunState = (
  donorMap: RunsByAnalysesByDonors
): DonorInfoMap => {
  const result: DonorInfoMap = {};
  Object.entries(donorMap).forEach(([donorId, map]) => {
    Object.entries(map).forEach(([inputAnalysesId, runs]) => {
      runs.forEach((run) => {
        if (run.state === RunState.COMPLETE) {
          if (result[donorId]) {
            result[donorId].mutectCompleted += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].mutectCompleted += 1;
          }
        }

        if (run.state === RunState.RUNNING) {
          if (result[donorId]) {
            result[donorId].mutectRunning += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].mutectRunning += 1;
          }
        }

        if (run.state === RunState.EXECUTOR_ERROR) {
          if (result[donorId]) {
            result[donorId].mutectFailed += 1;
          } else {
            initializeRdpcInfo(result, donorId);
            result[donorId].mutectFailed += 1;
          }
        }
      });
    });
  });

  return result;
};

// Removes COMPLETE (not RUNNING OR EXECUTOR_ERROR) runs with suppressed producedAnalyses
// Export for testing purpose.
// This function keeps 2 types of analyses:
// 1. analyses with Running or EXECUTOR_ERROR runs(these runs do not has no produced analyses)
// 2. analyses with COMPLETE runs that produced PUBLISHED analyses
export const removeCompleteRunsWithSuppressedAnalyses = (
  analyses: Analysis[]
): Analysis[] => {
  const result = analyses.reduce<Analysis[]>(
    (aanalysisAccumulator, analysis) => {
      const filteredRuns = analysis.runs.filter(
        (run) =>
          run.state !== RunState.COMPLETE ||
          (run.state === RunState.COMPLETE &&
            run.producedAnalyses &&
            run.producedAnalyses.length > 0)
      );
      const newAnalysis = {
        ...analysis,
        runs: [...filteredRuns],
      };
      aanalysisAccumulator.push(newAnalysis);
      return aanalysisAccumulator;
    },
    []
  );
  return result;
};

export const countAlignmentRunState = (
  donorMap: RunsByAnalysesByDonors
): DonorInfoMap => {
  const result: DonorInfoMap = {};
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
): DonorInfoMap => {
  const result: DonorInfoMap = {};
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
  result: DonorInfoMap,
  donorId: string
): void => {
  result[donorId] = { ...initialRdpcInfo };
};

export const initialRdpcInfo: Readonly<RdpcDonorInfo> = Object.freeze({
  publishedNormalAnalysis: 0,
  publishedTumourAnalysis: 0,
  alignmentsCompleted: 0,
  alignmentsRunning: 0,
  alignmentsFailed: 0,
  sangerVcsCompleted: 0,
  sangerVcsRunning: 0,
  sangerVcsFailed: 0,
  mutectCompleted: 0,
  mutectRunning: 0,
  mutectFailed: 0,
  totalFilesCount: 0,
  filesToQcCount: 0,
  releaseStatus: DonorMolecularDataReleaseStatus.NO_RELEASE,
  processingStatus: "REGISTERED",
});

export const mergeDonorInfo = (
  map: DonorInfoMap,
  mergeWith: DonorInfoMap
): DonorInfoMap => {
  const result = Object.entries(mergeWith).reduce<DonorInfoMap>(
    (acc, [donorId, rdpcInfo]) => {
      acc[donorId] = {
        publishedNormalAnalysis:
          (acc[donorId]?.publishedNormalAnalysis || 0) +
          rdpcInfo.publishedNormalAnalysis,
        publishedTumourAnalysis:
          (acc[donorId]?.publishedTumourAnalysis || 0) +
          rdpcInfo.publishedTumourAnalysis,
        rawReadsFirstPublishedDate: acc[donorId]?.rawReadsFirstPublishedDate
          ? acc[donorId].rawReadsFirstPublishedDate
          : rdpcInfo.rawReadsFirstPublishedDate,

        alignmentsCompleted:
          (acc[donorId]?.alignmentsCompleted || 0) +
          rdpcInfo.alignmentsCompleted,
        alignmentsRunning:
          (acc[donorId]?.alignmentsRunning || 0) + rdpcInfo.alignmentsRunning,
        alignmentsFailed:
          (acc[donorId]?.alignmentsFailed || 0) + rdpcInfo.alignmentsFailed,
        alignmentFirstPublishedDate: acc[donorId]?.alignmentFirstPublishedDate
          ? acc[donorId].alignmentFirstPublishedDate
          : rdpcInfo.alignmentFirstPublishedDate,

        sangerVcsCompleted:
          (acc[donorId]?.sangerVcsCompleted || 0) + rdpcInfo.sangerVcsCompleted,
        sangerVcsRunning:
          (acc[donorId]?.sangerVcsRunning || 0) + rdpcInfo.sangerVcsRunning,
        sangerVcsFailed:
          (acc[donorId]?.sangerVcsFailed || 0) + rdpcInfo.sangerVcsFailed,
        sangerVcsFirstPublishedDate: acc[donorId]?.sangerVcsFirstPublishedDate
          ? acc[donorId].sangerVcsFirstPublishedDate
          : rdpcInfo.sangerVcsFirstPublishedDate,

        mutectCompleted:
          (acc[donorId]?.mutectCompleted || 0) + rdpcInfo.mutectCompleted,
        mutectRunning:
          (acc[donorId]?.mutectRunning || 0) + rdpcInfo.mutectRunning,
        mutectFailed: (acc[donorId]?.mutectFailed || 0) + rdpcInfo.mutectFailed,
        mutectFirstPublishedDate: acc[donorId]?.mutectFirstPublishedDate
          ? acc[donorId].mutectFirstPublishedDate
          : rdpcInfo.mutectFirstPublishedDate,

        totalFilesCount:
          (acc[donorId]?.totalFilesCount || 0) + rdpcInfo.totalFilesCount,
        filesToQcCount:
          (acc[donorId]?.filesToQcCount || 0) + rdpcInfo.filesToQcCount,
        releaseStatus: rdpcInfo.releaseStatus,
        processingStatus: "REGISTERED",
      };
      return acc;
    },
    _.clone(map)
  );
  return result;
};
