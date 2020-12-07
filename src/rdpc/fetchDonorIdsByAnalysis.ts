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
  accessToken,
}: {
  analysisId: string;
  rdpcUrl: string;
  accessToken: string;
}) => {
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
      return data.analyses[0]?.donors.map(({ donorId }) => donorId) || [];
    });

  return output;
};
export default fetchDonorIdsByAnalysis;
