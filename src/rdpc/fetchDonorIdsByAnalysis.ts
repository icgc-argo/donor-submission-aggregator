import { EgoAccessToken, EgoJwtManager } from "auth";
import logger from "logger";
import fetch from "node-fetch";

const query = `
  query($analysisId: String) {
    analyses(
      filter: {
        analysisId: $analysisId
        analysisState: PUBLISHED
      }
    ) {
      donors {
        donorId
      }
    }
  }
`;

type QueryResponseData = {
  analyses: {
    donors: {
      donorId: string;
    }[];
  }[];
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
      if (data.analyses) {
        return data.analyses[0]?.donors.map(({ donorId }) => donorId) || [];
      } else {
        logger.info(`fetchDonorIdsByAnalysis: no analyses fetched from rdpc.`);
        return [];
      }
    });

  return output;
};
export default fetchDonorIdsByAnalysis;
