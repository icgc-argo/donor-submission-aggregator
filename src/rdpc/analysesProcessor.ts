import {
  Run,
  RunsByAnalysesByDonors,
  Analysis,
  DonorInfoMap,
  RunsByInputAnalyses,
  RunState,
  AnalysisType,
  SpecimensByDonors,
  Specimen,
  TumourNormalDesignationValue,
} from "./types";
import logger from "logger";
import HashCode from "ts-hashcode";
import { SANGER_VC_REPO_URL, SEQ_ALIGN_REPO_URL } from "config";
import fetchAnalyses from "rdpc/fetchAnalyses";
import { EgoJwtManager } from "auth";
import fetchAnalysesWithSpecimens from "./fetchAnalysesWithSpecimens";
import _ from "lodash";

type StreamState = {
  currentPage: number;
};

export const analysisStream_withSpecimens = async function* ({
  studyId,
  rdpcUrl,
  egoJwtManager,
  config,
  analysesFetcher = fetchAnalysesWithSpecimens,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  egoJwtManager: EgoJwtManager;
  config: {
    chunkSize: number;
  };
  analysesFetcher: typeof fetchAnalysesWithSpecimens;
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

export const analysisStream = async function* ({
  studyId,
  rdpcUrl,
  analysisType,
  egoJwtManager,
  config,
  analysesFetcher = fetchAnalyses,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  analysisType: string;
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

  const workflowRepoUrl =
    analysisType === AnalysisType.SEQ_ALIGNMENT
      ? SANGER_VC_REPO_URL
      : SEQ_ALIGN_REPO_URL;

  while (true) {
    const page = await analysesFetcher({
      studyId,
      rdpcUrl,
      workflowRepoUrl,
      analysisType,
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

// iterates over analyses to extract specimens by grouping specimens by donorId,
// note this function does not remove duplicate specimens, this is intended for
// counting tumour/normal sample numbers.
const aggregateSpecimensByDonorId = (
  analyses: Analysis[]
): SpecimensByDonors => {
  const result = analyses.reduce<SpecimensByDonors>(
    (specimenAccumulator, analysis) => {
      analysis.donors.forEach((donor) => {
        specimenAccumulator[donor.donorId] = specimenAccumulator[donor.donorId]
          ? [...specimenAccumulator[donor.donorId], ...donor.specimens]
          : donor.specimens;
      });
      return specimenAccumulator;
    },
    {}
  );

  return result;
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
  egoJwtManager,
  studyId,
  url,
  config,
  donorIds,
}: {
  studyId: string;
  url: string;
  analysisType: string;
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
        egoJwtManager,
        config,
        analysesFetcher,
        donorId,
      });
      for await (const page of stream) {
        if (page.length === 0) {
          logger.info(`No ${analysisType} analyses for streaming`);
        }
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
      egoJwtManager,
      config,
      analysesFetcher,
    });
    for await (const page of stream) {
      if (page.length === 0) {
        logger.info(`No ${analysisType} analyses for streaming`);
      }
      logger.info(`Streaming ${page.length} of ${analysisType} analyses...`);
      const filteredAnalyses = removeCompleteRunsWithSuppressedAnalyses(page);
      const donorPerPage = toDonorCentric(filteredAnalyses);
      getAllRunsByAnalysesByDonors(mergedDonors, donorPerPage);
    }
  }
  return mergedDonors;
};

export const getAllMergedDonorWithSpecimens = async ({
  analysesFetcher = fetchAnalysesWithSpecimens,
  egoJwtManager,
  studyId,
  url,
  config,
  donorIds,
}: {
  studyId: string;
  url: string;
  egoJwtManager: EgoJwtManager;
  donorIds?: string[];
  config: {
    chunkSize: number;
    state?: StreamState;
  };
  analysesFetcher: typeof fetchAnalysesWithSpecimens;
}): Promise<SpecimensByDonors> => {
  let mergedDonors: SpecimensByDonors = {};

  if (donorIds) {
    for (const donorId of donorIds) {
      logger.info(`streaming analyses with Specimens for donor ${donorId}`);
      const stream = analysisStream_withSpecimens({
        studyId,
        rdpcUrl: url,
        egoJwtManager,
        config,
        analysesFetcher,
        donorId,
      });
      for await (const page of stream) {
        if (page.length === 0) {
          logger.info(
            `No sequencing experiment analyses with specimens fetched`
          );
        }
        logger.info(
          `Streaming ${page.length} of sequencing experiment analyses with specimens...`
        );
        const donorPerPage = aggregateSpecimensByDonorId(page);
        mergeAllPagesSpecimensByDonorId(mergedDonors, donorPerPage);
      }
    }
  } else {
    const stream = analysisStream_withSpecimens({
      studyId,
      rdpcUrl: url,
      egoJwtManager,
      config,
      analysesFetcher,
    });
    for await (const page of stream) {
      if (page.length === 0) {
        logger.info(
          `No sequencing experiment analyses with specimens for streaming`
        );
      }
      logger.info(
        `Streaming ${page.length} of sequencing experiment analyses with specimens...`
      );
      const donorPerPage = aggregateSpecimensByDonorId(page);
      mergeAllPagesSpecimensByDonorId(mergedDonors, donorPerPage);
    }
  }
  return mergedDonors;
};

// merges specimens from all pages, as same donor ids can be found in multiple pages
const mergeAllPagesSpecimensByDonorId = (
  merged: SpecimensByDonors,
  toMerge: SpecimensByDonors
) => {
  Object.entries(toMerge).forEach(([donorId, specimens]) => {
    const mergedSpecimens = merged[donorId]
      ? [...merged[donorId], ...specimens]
      : specimens;
    merged[donorId] = mergedSpecimens;
  });
};

export const countSpecimenType = (donors: SpecimensByDonors): DonorInfoMap => {
  const result: DonorInfoMap = {};
  Object.entries(donors).forEach(([donorId, specimens]) => {
    for (const specimen of specimens) {
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

// Removes COMPLETE (not RUNNING OR EXECUTOR_ERROR) runs with suppressed producedAnalyses
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
