import { EgoAccessToken, EgoJwtManager } from "auth";
import logger from "logger";
import fetch from "node-fetch";
import promiseRetry from "promise-retry";
import { AnalysisState } from "rdpc/types";
import { Action } from "./types";

const query = `
query($analysisId: String, $analysisState: AnalysisState ) {
  analyses(
    filter: {
      analysisId: $analysisId
      analysisState: $analysisState
    }
  ) {
    content{
      donors {
        donorId
      }
    }
  }
}
`;

type QueryResponseData = {
  analyses: {
    content: {
      donors: {
        donorId: string;
      }[];
    }[];
  };
};

type QueryVariable = {
  analysisId: string;
  analysisState: string;
};

const fetchDonorIdsByAnalysis = async ({
  analysisId,
  action,
  rdpcUrl,
  egoJwtManager,
}: {
  analysisId: string;
  action: string;
  rdpcUrl: string;
  egoJwtManager: EgoJwtManager;
}) => {
  const jwt = (await egoJwtManager.getLatestJwt()) as EgoAccessToken;
  const accessToken = jwt.access_token;
  return await promiseRetry<string[]>(async (retry) => {
    try {
      const analysisState = determineAnalysisState(action);
      const body = JSON.stringify({
        query,
        variables: {
          analysisId,
          analysisState,
        } as QueryVariable,
      });
      logger.info(`RDPC API Request body: ${body}`);
      const output = await fetch(rdpcUrl, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body,
      })
        .then((res) => {
          const jsonResponse = res.json();
          logger.info(
            `RDPC-API Response for analisys: ${JSON.stringify(jsonResponse)}`
          );
          return jsonResponse;
        })
        .then((res: { data: QueryResponseData }) => {
          const { data } = res;
          if (data.analyses.content) {
            return (
              data.analyses.content[0]?.donors.map(({ donorId }) => donorId) ||
              []
            );
          } else {
            logger.info(
              `fetchDonorIdsByAnalysis: no analyses fetched from rdpc.`
            );
            return [];
          }
        });
      return output;
    } catch (err) {
      logger.warn(`Failed to fetch analyses: ${err}, retrying...`);
      return retry(err);
    }
  }, retryConfig).catch((err) => {
    logger.info(
      `failed to fetch analysis = ${analysisId} from RDPC ${rdpcUrl} after ${retryConfig.retries} attempts: ${err}`
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

const determineAnalysisState = (action: string) => {
  let analysisState = "";
  switch (action) {
    case Action.PUBLISH:
      analysisState = AnalysisState.PUBLISHED;
      break;
    case Action.UNPUBLISH:
      analysisState = AnalysisState.UNPUBLISHED;
      break;
    case Action.SUPPRESS:
      analysisState = AnalysisState.SUPPRESSED;
      break;
  }
  return analysisState;
};

export default fetchDonorIdsByAnalysis;
