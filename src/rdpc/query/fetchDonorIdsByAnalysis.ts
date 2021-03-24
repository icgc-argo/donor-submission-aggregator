import { EgoAccessToken, EgoJwtManager } from "auth";
import logger from "logger";
import fetch from "node-fetch";
import promiseRetry from "promise-retry";
import { retryConfig } from "./fetchAnalyses";

const query = `
query($analysisId: String) {
  analyses(
    filter: {
      analysisId: $analysisId
      analysisState: PUBLISHED
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
};

const fetchDonorIdsByAnalysis = async ({
  analysisId,
  rdpcUrl,
  egoJwtManager,
}: {
  analysisId: string;
  rdpcUrl: string;
  egoJwtManager: EgoJwtManager;
}) => {
  const jwt = (await egoJwtManager.getLatestJwt()) as EgoAccessToken;
  const accessToken = jwt.access_token;
  return await promiseRetry<string[]>(async (retry) => {
    try {
      const output = await fetch(rdpcUrl, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query,
          variables: {
            analysisId,
          } as QueryVariable,
        }),
      })
        .then((res) => res.json())
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

export default fetchDonorIdsByAnalysis;
