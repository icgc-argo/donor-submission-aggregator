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
}) =>
  fetch(rdpcUrl, {
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
    .then(({ data }: { data: QueryResponseData }) =>
      data.analyses[0]?.donors.map(({ donorId }) => donorId)
    );

export default fetchDonorIdsByAnalysis;
