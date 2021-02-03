import { EgoAccessToken, EgoJwtManager } from "auth";
import logger from "logger";
import fetch from "node-fetch";
import promiseRetry from "promise-retry";
import { PageQueryVar } from "rdpc/fetchAnalyses";
import { Analysis, AnalysisState, AnalysisType } from "rdpc/types";

const query = `
query ($analysisFilter: AnalysisFilter, $analysisPage: Page){
    analyses (
      filter: $analysisFilter,
      page: $analysisPage,
      sorts:{fieldName:analysisId, order: asc}
    ) {
      content {
        analysisId
        analysisType
        donors {
          donorId
          specimens {
            specimenId
            tumourNormalDesignation
          }
        }
      }
    }
}`;

type AnalysisFilterQueryVar = {
  analysisType?: string;
  analysisState?: string;
  studyId?: string;
  donorId?: string;
};

type QueryVariable = {
  analysisFilter: AnalysisFilterQueryVar;
  analysisPage: PageQueryVar;
};

const retryConfig = {
  factor: 2,
  retries: 5,
  minTimeout: 10,
  maxTimeout: Infinity,
};

const fetchAnalysesWithSpecimens = async ({
  studyId,
  rdpcUrl,
  from,
  size,
  egoJwtManager,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  from: number;
  size: number;
  egoJwtManager: EgoJwtManager;
  donorId?: string;
}): Promise<Analysis[]> => {
  const jwt = (await egoJwtManager.getLatestJwt()) as EgoAccessToken;
  const accessToken = jwt.access_token;
  return await promiseRetry<Analysis[]>(async (retry) => {
    try {
      logger.info(
        `Fetching sequencing experiment analyses with specimens from rdpc.....`
      );
      const response = await fetch(rdpcUrl, {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: {
            analysisFilter: {
              analysisType: AnalysisType.SEQ_EXPERIMENT,
              analysisState: AnalysisState.PUBLISHED,
              studyId,
              donorId,
            },
            analysisPage: {
              from,
              size,
            },
          } as QueryVariable,
        }),
        headers: {
          "Content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
      });
      const jsonResponse = await response.json();
      const hasError = jsonResponse.errors?.length > 0;
      if (hasError) {
        logger.error(
          `received error from rdpc... page: from => ${from} size => ${size}`
        );
      }
      return jsonResponse.data.analyses.content as Analysis[];
    } catch (err) {
      logger.warn(
        `Failed to fetch sequencing experiment analyses with specimens: ${err}, retrying...`
      );
      return retry(err);
    }
  }, retryConfig).catch((err) => {
    logger.error(
      `Failed to fetch analyses with specimens of program: ${studyId} from RDPC ${rdpcUrl} after ${retryConfig.retries} attempts: ${err}`
    );
    throw err;
  });
};

export default fetchAnalysesWithSpecimens;
