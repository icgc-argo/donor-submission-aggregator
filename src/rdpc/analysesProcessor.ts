import {
  Donor,
  Run,
  RunsByAnalysesByDonors,
  Analysis,
  DonorInfoMap,
  RunsByInputAnalyses,
  RunState,
  SpecimensByDonors,
  TumourNormalDesignationValue,
  DonorData,
  StringMap,
  FlattenedSample,
  SamplePair,
} from "./types";
import logger from "logger";
import HashCode from "ts-hashcode";
import fetchAnalyses from "rdpc/fetchAnalyses";
import { EgoJwtManager } from "auth";
import fetchAnalysesWithSpecimens from "./fetchAnalysesWithSpecimens";
import _ from "lodash";

type StreamState = {
  currentPage: number;
};

const analysisStream_withSpecimens = async function* ({
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
      isMutect,
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
}): Promise<StringMap<DonorData>> => {
  const donorMap: StringMap<DonorData> = {};

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

        const donorDataMapPerPage: StringMap<DonorData> = convertAnalysisToDonorData(
          page
        );
        mergeAllPagesDonorData(donorMap, donorDataMapPerPage);
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

      const donorDataMapPerPage: StringMap<DonorData> = convertAnalysisToDonorData(
        page
      );
      mergeAllPagesDonorData(donorMap, donorDataMapPerPage);
    }
  }
  return donorMap;
};

const convertAnalysisToDonorData = (
  analyses: Analysis[]
): StringMap<DonorData> => {
  const donorDataMapPerPage: StringMap<DonorData> = analyses.reduce<
    StringMap<DonorData>
  >((donorDataAccumulator, analysis) => {
    analysis.donors.forEach((donor) => {
      // Analysis.experiment.experimental_strategy and experiment.library_strategy are the SAME fields,
      // currently becuase of historical reasons, some analyses use experimental_strategy and some
      // use library_strategy, tickets are made to ensure all analyses use experimental_strategy in
      // the future, but for now we must consider both fields.
      const experimentStrategy = analysis.experiment.experimental_strategy
        ? analysis.experiment.experimental_strategy
        : analysis.experiment.library_strategy;

      const donorData = getDonorData(
        donor,
        analysis.firstPublishedAt,
        experimentStrategy
      );
      mergeDonorData(donorDataAccumulator, donorData);
    });
    return donorDataAccumulator;
  }, {});

  return donorDataMapPerPage;
};

// merged has accumulated DonorData map, toMerge has the current DonorData map
const mergeAllPagesDonorData = (
  merged: StringMap<DonorData>,
  toMerge: StringMap<DonorData>
) => {
  Object.entries(toMerge).forEach(([donorId, donorData]) => {
    if (merged[donorId]) {
      merged[donorId].specimen = [
        ...merged[donorId].specimen,
        ...donorData.specimen,
      ];
      merged[donorId].samplePairs = [
        ...merged[donorId].samplePairs,
        ...donorData.samplePairs,
      ];
    } else {
      merged[donorId] = donorData;
    }
  });
};

const mergeDonorData = (map: StringMap<DonorData>, donorData: DonorData) => {
  if (map[donorData.donorId]) {
    map[donorData.donorId].specimen = [
      ...map[donorData.donorId].specimen,
      ...donorData.specimen,
    ];
    map[donorData.donorId].samplePairs = [
      ...map[donorData.donorId].samplePairs,
      ...donorData.samplePairs,
    ];
  } else {
    map[donorData.donorId] = donorData;
  }
};

// extracts specimen and sample from Donor to form a sample/specimen object
const getDonorData = (
  donor: Donor,
  firstPublishedAt: string,
  experimentStrategy: string
): DonorData => {
  // there is only 1 specimen and  1 sample in each sequencing experiment analysis,
  // So we can flatten the spcimen[] and sample[]
  const specimen = donor.specimens[0];
  const sample = specimen.samples[0];

  const flattenedSample: FlattenedSample = {
    specimenId: specimen.specimenId,
    tumourNormalDesignation:
      specimen.tumourNormalDesignation === TumourNormalDesignationValue.Normal
        ? TumourNormalDesignationValue.Normal
        : TumourNormalDesignationValue.Tumour,
    submitterSampleId: sample.submitterSampleId,
    matchedNormalSubmitterSampleId:
      sample.matchedNormalSubmitterSampleId === null
        ? ""
        : sample.matchedNormalSubmitterSampleId,
    firstPublishedAt: firstPublishedAt,
    experimentStrategy: experimentStrategy,
  };

  const samplePair: SamplePair =
    flattenedSample.tumourNormalDesignation ===
    TumourNormalDesignationValue.Normal
      ? {
          normalSample: flattenedSample,
          firstPublishedAt: Number(flattenedSample.firstPublishedAt),
        }
      : {
          tumourSample: flattenedSample,
          firstPublishedAt: Number(flattenedSample.firstPublishedAt),
        };

  return {
    donorId: donor.donorId,
    specimen: donor.specimens,
    samplePairs: [samplePair],
  };
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

export const samplePairToDonorInfo = (
  samplePairs: StringMap<SamplePair>
): DonorInfoMap => {
  const donorInfo: DonorInfoMap = {};
  Object.entries(samplePairs).forEach(([donorId, pair]) => {
    if (pair.firstPublishedAt !== 0) {
      initializeRdpcInfo(donorInfo, donorId);
      donorInfo[donorId].rawReadsFirstPublishedDate = new Date(
        pair.firstPublishedAt
      );
    }
  });
  return donorInfo;
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
    mutectCompleted: 0,
    mutectRunning: 0,
    mutectFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: "NO_RELEASE",
    processingStatus: "REGISTERED",
  };
};

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
        rawReadsFirstPublishedDate: rdpcInfo.rawReadsFirstPublishedDate,

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

        mutectCompleted:
          (acc[donorId]?.mutectCompleted || 0) + rdpcInfo.mutectCompleted,
        mutectRunning:
          (acc[donorId]?.mutectRunning || 0) + rdpcInfo.mutectRunning,
        mutectFailed: (acc[donorId]?.mutectFailed || 0) + rdpcInfo.mutectFailed,

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
