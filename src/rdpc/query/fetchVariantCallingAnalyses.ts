import { EgoAccessToken, EgoJwtManager } from "auth";
import logger from "logger";
import fetch from "node-fetch";
import promiseRetry from "promise-retry";
import { Analysis, AnalysisType } from "../types";
import { QueryVariable } from "./types";

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
        firstPublishedAt

        workflow{
          workflowName
        }

        donors {
          donorId
        }
      }
    }
}
`;

const fetchVariantCallingAnalyses = async ({
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
      const response = await fetch(rdpcUrl, {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: {
            analysisFilter: {
              analysisState: "PUBLISHED",
              analysisType: AnalysisType.VARIANT_CALLING,
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
        const error = JSON.stringify(jsonResponse.errors);
        logger.error(
          `received error from rdpc... page: from => ${from} size => ${size}. Error: ${error}`
        );
        throw new Error(error);
      }
      return jsonResponse.data.analyses.content as Analysis[];
    } catch (err) {
      logger.warn(
        `Failed to fetch variant calling analyses: ${err}, retrying...`
      );
      return retry(err);
    }
  }, retryConfig).catch((err) => {
    logger.error(
      `Failed to fetch analyses of program: ${studyId} from RDPC ${rdpcUrl} after ${retryConfig.retries} attempts: ${err}`
    );
    throw err;
  });
};

const retryConfig = {
  factor: 2,
  retries: 3,
  minTimeout: 1000,
  maxTimeout: Infinity,
};

export default fetchVariantCallingAnalyses;
