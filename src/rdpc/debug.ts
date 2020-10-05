import { fetchRDPC, workflowStream, indexRdpc, toDonorCentric } from "./index";
import { STREAM_CHUNK_SIZE } from "config";
import logger from "logger";
import {
  Analysis,
  Donor,
  DonorCentricRun,
  DonorDoc,
  DonorDocMap,
  InputAnalysis,
  Run,
} from "./types";
import _ from "lodash";

const run = async () => {
  const page_1 = [
    {
      runId: "wes-318285aaea584b0c935c8a7989757038",
      state: "EXECUTOR_ERROR",
      repository: "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
      inputAnalyses: [
        {
          analysisId: "916b95a5-42d7-46a8-ab95-a542d7a6a81e",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250183",
            },
            {
              donorId: "DO250184",
            },
          ],
        },
        {
          analysisId: "94c862ca-8055-4794-8862-ca8055479490",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250183",
            },
            {
              donorId: "DO250185",
            },
          ],
        },
      ],
    },
    {
      runId: "wes-331cd527841e444091aaabf405335c8b",
      state: "COMPLETE",
      repository: "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
      inputAnalyses: [
        {
          analysisId: "ce2a49b2-2bda-4ded-aa49-b22bdaadedb3",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250183",
            },
            {
              donorId: "DO250186",
            },
          ],
        },
        {
          analysisId: "ad7e2df1-03ea-4dae-be2d-f103ea7dae3a",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250183",
            },
            {
              donorId: "DO250187",
            },
          ],
        },
      ],
    },
  ];

  const page_2 = [
    {
      runId: "wes-448285aaea584b0c935c8a7989757038",
      state: "EXECUTOR_ERROR",
      repository: "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
      inputAnalyses: [
        {
          analysisId: "916b95a5-42d7-46a8-ab95-a542d7a6a81e",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250183",
            },
          ],
        },
        {
          analysisId: "94c862ca-8055-4794-8862-ca8055479490",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250183",
            },
          ],
        },
      ],
    },
    {
      runId: "wes-771cd527841e444091aaabf405335c8b",
      state: "COMPLETE",
      repository: "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
      inputAnalyses: [
        {
          analysisId: "ce2a49b2-2bda-4ded-aa49-b22bdaadedb3",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250186",
            },
          ],
        },
        {
          analysisId: "ad7e2df1-03ea-4dae-be2d-f103ea7dae3a",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250187",
            },
          ],
        },
      ],
    },
  ];

  const runs = [page_1, page_2];

  const donorDoc = toDonorCentric(page_1);
  console.log("Donor centric ============" + JSON.stringify(donorDoc));

  // for(const page of runs) {
  //   const donorDoc = toDonorCentric(page);
  //   console.log('Donor centric ============' + JSON.stringify(donorDoc));
  // }

  // const config = { chunkSize: 2 };
  // const stream = workflowStream(config);
  // let chunksCount = 0;
  // for await (const runs of stream) {
  //   const timer = `streaming ${ runs.length} workflow runs...`
  //   //   logger.profile(timer);
  //   console.log(
  //       `streaming ${runs.length} runs }`)

  //   const donorDoc = toDonorCentric(runs);

  //   console.log('Donor centric ============' + JSON.stringify(donorDoc));
  // } ;
};

run();
