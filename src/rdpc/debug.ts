import { fetchRDPC, workflowStream, indexRdpc } from "./index";
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

const mergeMaps = (map: DonorDocMap, toMerge: DonorDocMap): DonorDocMap => {
  for (const key in map) {
    for (const mergeKey in toMerge) {
      if (map[mergeKey]) {
        const newRuns = _.union(map[mergeKey].runs, toMerge[mergeKey].runs);
        map[mergeKey].runs = newRuns;
      } else {
        map[mergeKey] = toMerge[mergeKey];
      }
    }
  }
  return map;
};

const run = async () => {
  // Test 1:
  //   const data = await fetchRDPC(0, 10);

  const runs = [
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
          ],
        },
        {
          analysisId: "ad7e2df1-03ea-4dae-be2d-f103ea7dae3a",
          analysisType: "sequencing_alignment",
          donors: [
            {
              donorId: "DO250183",
            },
          ],
        },
      ],
    },
  ];

  const result = runs.reduce<DonorDocMap>((acc, run) => {
    const donorsForCurrentRun = run.inputAnalyses.map(
      (analysis: { donors: Donor[] }) => {
        return analysis.donors.map((donor) => {
          return {
            donorId: donor.donorId,
            runs: [run],
          };
        });
      }
    );

    console.log(
      "donorsForCurrentRun ----" + JSON.stringify(donorsForCurrentRun)
    );

    const flattenedDonors = donorsForCurrentRun.reduce<DonorDoc[]>(
      (_acc, donors) => {
        return [..._acc, ...donors];
      },
      []
    );

    console.log(
      "flattenedDonors donors ====== " + JSON.stringify(flattenedDonors)
    );

    const furtherReduced = flattenedDonors.reduce<{ [key: string]: DonorDoc }>(
      (_acc, donor) => {
        const previousRuns = _acc[donor.donorId]
          ? _acc[donor.donorId].runs
          : [];
        _acc[donor.donorId] = {
          ...donor,
          runs: _.union([...previousRuns, ...donor.runs]),
        };
        return _acc;
      },
      {}
    );
    console.log("Further reduced: ----- " + JSON.stringify(furtherReduced));

    return mergeMaps(acc, furtherReduced);
  }, {});

  console.log("result +++++++++++++++++++++ ", JSON.stringify(result));

  // Test 2:
  // const config = { chunkSize: 2};
  // // const stream = workflowStream(config);
  // let chunksCount = 0;
  // for await (const runs of stream) {
  //   const timer = `streaming ${ runs.length} workflow runs...`
  //   //   logger.profile(timer);
  //   console.log(
  //       `streaming ${runs.length} runs }`
  //   );

  // }

  //   console.log(stream);

  // type PeoplePet = {
  //  name: string;
  //  pet : string;
  // }

  // const peoplePet : PeoplePet[] =
  // [
  //     {name: 'M', pet: 'dog'},
  //     {name: 'Ro', pet : 'cat'},
  //     {name: 'J', pet : 'cat'}
  // ];

  // type Result = {
  //   [name: string]: string[]
  // }

  // const aggregate =
  // peoplePet.reduce< Result >((acc, personPet) => {
  //   const previouslyRecordedSet = acc[personPet.pet] || [];
  //   return {
  //     ...acc,
  //     [personPet.pet]: [...previouslyRecordedSet, personPet.name],
  //   }
  // }
  // , {});

  // console.log(aggregate);
};

run();
