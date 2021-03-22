import { EgoJwtManager } from "auth";
import _ from "lodash";
import logger from "logger";
import { initializeRdpcInfo } from "./analysesProcessor";
import fetchVariantCallingAnalyses from "./query/fetchVariantCallingAnalyses";
import {
  Analysis,
  DonorInfoMap,
  SangerAndMutectInfo,
  StringMap,
} from "./types";

export const variantCallingStream = async function* ({
  studyId,
  rdpcUrl,
  egoJwtManager,
  config,
  analysesFetcher = fetchVariantCallingAnalyses,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  egoJwtManager: EgoJwtManager;
  config: {
    chunkSize: number;
  };
  analysesFetcher: typeof fetchVariantCallingAnalyses;
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

export const convertEalriestDateToDonorInfo = (
  donors: StringMap<SangerAndMutectInfo>
): DonorInfoMap => {
  const result: DonorInfoMap = {};

  Object.entries(donors).forEach(([donorId, info]) => {
    initializeRdpcInfo(result, donorId);

    if (info.sangerVC[0]) {
      result[donorId].sangerVcsFirstPublishedDate = new Date(
        Number(info.sangerVC[0].firstPublishedAt)
      );
    }

    if (info.mutect[0]) {
      result[donorId].mutectFirstPublishedDate = new Date(
        Number(info.mutect[0].firstPublishedAt)
      );
    }
  });

  return result;
};

// find the earliest dates for donor's sanger and mutect
export const getEarliestDateForDonor = (
  donors: StringMap<SangerAndMutectInfo>
): StringMap<SangerAndMutectInfo> => {
  const result: StringMap<SangerAndMutectInfo> = {};
  Object.entries(donors).forEach(([donorId, info]) => {
    const wfInfo: SangerAndMutectInfo = { sangerVC: [], mutect: [] };
    const earliestSanger = _.head(
      _.sortBy(info.sangerVC, (sanger) => Number(sanger.firstPublishedAt))
    );
    if (earliestSanger) {
      wfInfo.sangerVC.push(earliestSanger);
    }

    const earliestMutect = _.head(
      _.sortBy(info.mutect, (mutect) => Number(mutect.firstPublishedAt))
    );
    if (earliestMutect) {
      wfInfo.mutect.push(earliestMutect);
    }
    result[donorId] = wfInfo;
  });
  return result;
};

export const getAllMergedDonor_variantCalling = async ({
  analysesFetcher = fetchVariantCallingAnalyses,
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
  analysesFetcher: typeof fetchVariantCallingAnalyses;
}): Promise<StringMap<SangerAndMutectInfo>> => {
  const mergedDonors: StringMap<SangerAndMutectInfo> = {};

  if (donorIds) {
    for (const donorId of donorIds) {
      logger.info(`streaming analyses for donor ${donorId}`);
      const stream = variantCallingStream({
        studyId,
        rdpcUrl: url,
        egoJwtManager,
        config,
        analysesFetcher,
        donorId,
      });
      for await (const page of stream) {
        if (page.length === 0) {
          logger.info(`No variant calling analyses for streaming`);
        }
        logger.info(`Streaming ${page.length} of variant calling analyses...`);

        const donorPerPage = convertAnalysis(page);
        mergeAllDonors(mergedDonors, donorPerPage);
      }
    }
  } else {
    const stream = variantCallingStream({
      studyId,
      rdpcUrl: url,
      egoJwtManager,
      config,
      analysesFetcher,
    });
    for await (const page of stream) {
      if (page.length === 0) {
        logger.info(`No variant calling analyses for streaming`);
      }
      logger.info(`Streaming ${page.length} of variant calling analyses...`);
      const donorPerPage = convertAnalysis(page);
      mergeAllDonors(mergedDonors, donorPerPage);
    }
  }
  return mergedDonors;
};

// todo remove export
export const mergeAllDonors = (
  merged: StringMap<SangerAndMutectInfo>,
  mergeWith: StringMap<SangerAndMutectInfo>
) => {
  Object.entries(mergeWith).forEach(([donorId, info]) => {
    if (merged[donorId]) {
      merged[donorId].sangerVC = [
        ...merged[donorId].sangerVC,
        ...info.sangerVC,
      ];
      merged[donorId].mutect = [...merged[donorId].mutect, ...info.mutect];
    } else {
      merged[donorId] = info;
    }
  });
};

// todo remove export
export const convertAnalysis = (
  analyses: Analysis[]
): StringMap<SangerAndMutectInfo> => {
  const result: StringMap<SangerAndMutectInfo> = {};
  analyses.forEach((analysis) => {
    const infoMapPerAnalysis = analysis.donors.reduce<
      StringMap<SangerAndMutectInfo>
    >((infoAccumulator, donor) => {
      const workflowName = analysis.workflow.workflowName.toLocaleLowerCase();
      const info: SangerAndMutectInfo = {
        sangerVC: [],
        mutect: [],
      };

      const workflowData = {
        analysisId: analysis.analysisId,
        workflowName: analysis.workflow.workflowName,
        firstPublishedAt: analysis.firstPublishedAt,
      };

      if (workflowName.includes("mutect2")) {
        info.mutect.push(workflowData);
      }

      if (workflowName.includes("sanger")) {
        info.sangerVC.push(workflowData);
      }

      infoAccumulator[donor.donorId] = info;
      return infoAccumulator;
    }, {});

    // merge infoMapPerAnalysis to result
    mergeAllDonors(result, infoMapPerAnalysis);
  });
  return result;
};

type StreamState = {
  currentPage: number;
};
