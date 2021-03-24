import { EgoJwtManager } from "auth";
import { FirstPublishedDateFields } from "indexClinicalData/types";
import logger from "logger";
import { initializeRdpcInfo } from "./analysesProcessor";
import fetchAnalysesWithSpecimens from "./query/fetchAnalysesWithSpecimens";
import {
  Analysis,
  Donor,
  DonorData,
  DonorInfoMap,
  FlattenedSample,
  SamplePair,
  StringMap,
  TumourNormalDesignationValue,
} from "./types";

export const getAllMergedDonorWithSpecimens = async ({
  analysesFetcher = fetchAnalysesWithSpecimens,
  egoJwtManager,
  studyId,
  url,
  analysisType,
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
  analysesFetcher: typeof fetchAnalysesWithSpecimens;
}): Promise<StringMap<DonorData>> => {
  const donorMap: StringMap<DonorData> = {};

  if (donorIds) {
    for (const donorId of donorIds) {
      logger.info(
        `streaming ${analysisType} analyses with Specimens for donor ${donorId}`
      );
      const stream = analysisStream_withSpecimens({
        studyId,
        rdpcUrl: url,
        analysisType,
        egoJwtManager,
        config,
        analysesFetcher,
        donorId,
      });
      for await (const page of stream) {
        logger.info(
          `Streaming ${page.length} of ${analysisType} analyses with specimens and samples...`
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
      analysisType,
      egoJwtManager,
      config,
      analysesFetcher,
    });

    for await (const page of stream) {
      logger.info(
        `Streaming ${page.length} of ${analysisType} analyses with specimens and samples...`
      );
      const donorDataMapPerPage: StringMap<DonorData> = convertAnalysisToDonorData(
        page
      );
      mergeAllPagesDonorData(donorMap, donorDataMapPerPage);
    }
  }
  return donorMap;
};

export const getFirstPublishedDate = (
  samplePairs: StringMap<SamplePair>,
  fieldName: string
): DonorInfoMap => {
  const donorInfo: DonorInfoMap = {};
  Object.entries(samplePairs).forEach(([donorId, pair]) => {
    if (pair.firstPublishedAt !== 0) {
      initializeRdpcInfo(donorInfo, donorId);

      if (
        fieldName === FirstPublishedDateFields.RAW_READS_FIRST_PUBLISHED_DATE
      ) {
        donorInfo[donorId].rawReadsFirstPublishedDate = new Date(
          pair.firstPublishedAt
        );
      }

      if (
        fieldName === FirstPublishedDateFields.ALIGNMENT_FIRST_PUBLISHED_DATE
      ) {
        donorInfo[donorId].alignmentFirstPublishedDate = new Date(
          pair.firstPublishedAt
        );
      }
    }
  });
  return donorInfo;
};

const analysisStream_withSpecimens = async function* ({
  studyId,
  rdpcUrl,
  analysisType,
  egoJwtManager,
  config,
  analysesFetcher = fetchAnalysesWithSpecimens,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  analysisType: string;
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

type StreamState = {
  currentPage: number;
};
