import fetch from "node-fetch";
import { Analysis } from "./types";
import logger from "logger";
import promiseRetry from "promise-retry";
import _ from "lodash";

const query = `
  fragment AnalysisData on Analysis {
    analysisId
    analysisType
    donors {
      donorId
    }
  }

  query($analysisFilter: AnalysisFilter, $analysisPage: Page, $workflowRepoUrl: String) {
    analyses(
      filter: $analysisFilter,
      page: $analysisPage
    ) {
      ...AnalysisData
      runs: inputForRuns(
        filter: {
          repository: $workflowRepoUrl
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

type AnalysisFilterQueryVar = {
  analysisType?: string;
  analysisState?: "PUBLISHED";
  studyId?: string;
  donorId?: string;
};

type PageQueryVar = {
  from: number;
  size: number;
};

type QueryVariable = {
  analysisFilter: AnalysisFilterQueryVar;
  analysisPage: PageQueryVar;
  workflowRepoUrl: string;
};

const retryConfig = {
  factor: 2,
  retries: 5,
  minTimeout: 10,
  maxTimeout: Infinity,
};

const fetchAnalyses = async ({
  studyId,
  rdpcUrl,
  workflowRepoUrl,
  analysisType,
  from,
  size,
  accessToken,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  workflowRepoUrl: string;
  analysisType: string;
  from: number;
  size: number;
  accessToken: string;
  donorId?: string;
}): Promise<Analysis[]> => {
  return await promiseRetry<Analysis[]>(async (retry) => {
    try {
      logger.info(`Fetching ${analysisType} analyses from rdpc.....`);
      const response = await fetch(rdpcUrl, {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: {
            analysisFilter: {
              analysisState: "PUBLISHED",
              analysisType,
              studyId,
              donorId,
            },
            analysisPage: {
              from,
              size,
            },
            workflowRepoUrl,
          } as QueryVariable,
        }),
        headers: {
          "Content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
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

export default fetchAnalyses;
