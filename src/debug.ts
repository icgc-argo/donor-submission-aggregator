import { createEgoJwtManager } from "auth";
import { RDPC_URL, SEQ_ALIGN_REPO_URL } from "config";
import fetchAnalysesWithSpecimens from "rdpc/fetchAnalysesWithSpecimens";
import { access } from "fs";
import { result } from "lodash";
import {
  aggregateSpecimensByDonorId,
  countSpecimenType,
  mergeAllPagesSpecimensByDonorId,
} from "rdpc/analysesProcessor";
import fetchAnalyses from "rdpc/fetchAnalyses";
import {
  AnalysisState,
  AnalysisType,
  AnalysisWithSpecimens,
  Specimen,
  SpecimensByDonors,
  TumourNormalDesignationValue,
} from "rdpc/types";

import fetch from "node-fetch";
import logger from "logger";
import promiseRetry from "promise-retry";
import _ from "lodash";
import { EgoAccessToken, EgoJwtManager } from "auth";

(async () => {
  const query = `
    fragment AnalysisData on Analysis {
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

    query($analysisFilter: AnalysisFilter, $analysisPage: Page, $workflowRepoUrl: String) {
      analyses(
        filter: $analysisFilter,
        page: $analysisPage,
        sorts:{fieldName:analysisId, order: asc}
      ) {
        content {
          ...AnalysisData
          runs: inputForRuns(
            filter: {
              repository: $workflowRepoUrl
            }
          ) {
            runId
            state
            repository
            inputAnalyses {
                analysisId
                analysisType
              }
            }
        }
         info{
          contentCount
          hasNextFrom
          totalHits
        }
      }
    }
    `;

  type AnalysisFilterQueryVar = {
    analysisType?: string;
    analysisState?: "PUBLISHED";
    studyId?: string;
    donorId?: string;
  };

  type PageQueryVar = {
    from: number;
    size: number;
  };

  type QueryVariable = {
    analysisFilter: AnalysisFilterQueryVar;
    analysisPage: PageQueryVar;
    workflowRepoUrl?: string;
  };

  const retryConfig = {
    factor: 2,
    retries: 5,
    minTimeout: 10,
    maxTimeout: Infinity,
  };

  interface Analysis {
    analysisId: string;
    analysisType: string;
    donors: Donor[];
    runs: Run[];
  }

  interface Donor {
    donorId: string;
    specimens: Specimen[];
  }

  const egoJwtManager = await createEgoJwtManager();
  const rdpcUrl = "https://api.rdpc.cancercollaboratory.org/graphql";
  const workflowRepoUrl = SEQ_ALIGN_REPO_URL;

  const analyses = await fetchAnalyses({
    studyId: "PACA-CA",
    rdpcUrl: rdpcUrl,
    analysisType: AnalysisType.SEQ_EXPERIMENT,
    workflowRepoUrl,
    from: 0,
    size: 100,
    egoJwtManager: egoJwtManager,
  });

  // console.log(JSON.stringify(analyses));

  const analyses_page_1: AnalysisWithSpecimens[] = [
    {
      analysisId: "7de2681e-ead3-4456-a268-1eead384569c",
      analysisType: AnalysisType.SEQ_EXPERIMENT,
      analysisState: AnalysisState.PUBLISHED,
      donors: [
        {
          donorId: "DO35141",
          specimens: [
            {
              specimenId: "SP77801",
              tumourNormalDesignation: TumourNormalDesignationValue.Normal,
            },
            {
              specimenId: "SP77802",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
          ],
        },
        {
          donorId: "DO35142",
          specimens: [
            {
              specimenId: "SP77803",
              tumourNormalDesignation: TumourNormalDesignationValue.Normal,
            },
          ],
        },
        {
          donorId: "DO35143",
          specimens: [
            {
              specimenId: "SP77804",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
          ],
        },
      ],
    },
    {
      analysisId: "f31a3153-3192-454f-9a31-533192654f3f",
      analysisType: AnalysisType.SEQ_EXPERIMENT,
      analysisState: AnalysisState.PUBLISHED,
      donors: [
        {
          donorId: "DO35141",
          specimens: [
            {
              specimenId: "SP77801",
              tumourNormalDesignation: TumourNormalDesignationValue.Normal,
            },
            {
              specimenId: "SP77805",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
            {
              specimenId: "SP77806",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
          ],
        },
        {
          donorId: "DO35144",
          specimens: [
            {
              specimenId: "SP77899",
              tumourNormalDesignation: TumourNormalDesignationValue.Normal,
            },
          ],
        },
        {
          donorId: "DO35145",
          specimens: [],
        },
      ],
    },
  ];

  const analyses_page_2: AnalysisWithSpecimens[] = [
    {
      analysisId: "ed311e53-bc62-4861-b11e-53bc62286101",
      analysisType: AnalysisType.SEQ_EXPERIMENT,
      analysisState: AnalysisState.PUBLISHED,
      donors: [
        {
          donorId: "DO35141",
          specimens: [
            {
              specimenId: "SP77801",
              tumourNormalDesignation: TumourNormalDesignationValue.Normal,
            },
            {
              specimenId: "SP77809",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
          ],
        },
        {
          donorId: "DO35190",
          specimens: [
            {
              specimenId: "SP77890",
              tumourNormalDesignation: TumourNormalDesignationValue.Normal,
            },
          ],
        },
        {
          donorId: "DO35191",
          specimens: [
            {
              specimenId: "SP77891",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
          ],
        },
      ],
    },
    {
      analysisId: "ebd69815-c27f-45d3-9698-15c27fc5d331",
      analysisType: AnalysisType.SEQ_EXPERIMENT,
      analysisState: AnalysisState.PUBLISHED,
      donors: [
        {
          donorId: "DO35192",
          specimens: [
            {
              specimenId: "SP77892",
              tumourNormalDesignation: TumourNormalDesignationValue.Normal,
            },
            {
              specimenId: "SP77893",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
            {
              specimenId: "SP77894",
              tumourNormalDesignation: TumourNormalDesignationValue.Tumour,
            },
          ],
        },
        {
          donorId: "DO35188",
          specimens: [],
        },
      ],
    },
  ];

  // const mergedSpecimens = (
  //     existingSpecimens: Specimen[] ,
  //     toMerge: Specimen[]
  //   ): Specimen[] => {
  //     const combined = existingSpecimens.concat(toMerge);
  //     const map = new Map();
  //     for(const specimen of combined) {
  //         map.set(specimen.specimenId, specimen);
  //     }
  //     const result = [...map.values()];
  //     return result;
  // }

  // const result_page_1 = aggregateSpecimensByDonorId(analyses_page_1);
  // console.log(JSON.stringify(result_page_1))

  // let mergedDonors: SpecimensByDonors = {};
  // mergeAllPagesSpecimensByDonorId(mergedDonors, result_page_1);

  // const result_page_2 = aggregateSpecimensByDonorId(analyses_page_2)
  // console.log(JSON.stringify(result_page_2))

  // mergeAllPagesSpecimensByDonorId(mergedDonors, result_page_2);

  // console.log(JSON.stringify(mergedDonors))

  // const counted = countSpecimenType(mergedDonors);

  // console.log(JSON.stringify(counted))
})();
