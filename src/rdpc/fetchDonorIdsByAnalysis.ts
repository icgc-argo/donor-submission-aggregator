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
}: {
  analysisId: string;
  rdpcUrl: string;
}) => {
  const output = await fetch(rdpcUrl, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      variable: {
        analysisId,
      } as QueryVariable,
    }),
  })
    .then((res) => res.json())
    .then((res: { data: QueryResponseData }) => {
      const { data } = res;
      console.log("res: ", res);
      return data.analyses[0]?.donors.map(({ donorId }) => donorId);
    });

  return output;
};
export default fetchDonorIdsByAnalysis;
