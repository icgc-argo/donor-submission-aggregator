import { DonorMolecularDataReleaseStatus } from "files/types";
import { DonorInfoMap, RunState } from "rdpc/types";

export const donorCentric_page_1_expected = {
  DO35222: {
    "-2571731288": [
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        sessionId: "3bc5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
  },
  DO35228: {
    "818717527": [
      {
        runId: "wes-ff9ac3f9d7dc41f4abce9c015077d949",
        state: "COMPLETE",
        sessionId: "951e6b51-06d4-4281-a204-b7d2f23b090c",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
  },
};

export const donorCentric_page_2_expected = {
  DO35198: {
    "-1864409666": [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        sessionId: "29bf4110-757b-4ee8-aeb1-942f02b201be",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
  },
  DO35222: {
    "1047747475": [
      {
        runId: "wes-4b90558cd2a54592bb1dfce7310d8f6b",
        state: "COMPLETE",
        sessionId: "34c5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
  },
};
// Expected result of function mergeDonorMaps():
export const mergedPage_expected = {
  DO35222: {
    "1047747475": [
      {
        runId: "wes-4b90558cd2a54592bb1dfce7310d8f6b",
        state: "COMPLETE",
        sessionId: "34c5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
    "-2571731288": [
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        sessionId: "3bc5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
  },
  DO35228: {
    "818717527": [
      {
        runId: "wes-ff9ac3f9d7dc41f4abce9c015077d949",
        state: "COMPLETE",
        sessionId: "951e6b51-06d4-4281-a204-b7d2f23b090c",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
  },
  DO35198: {
    "-1864409666": [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        sessionId: "29bf4110-757b-4ee8-aeb1-942f02b201be",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
        producedAnalyses: [
          { analysisId: "d970697a-507a-41e3-b069-7a507a81e37d" },
          { analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b" },
        ],
      },
    ],
  },
};

export const donorStateMap_expected: DonorInfoMap = {
  DO35222: {
    matchedTNPairsDNA: 0,
    rnaPublishedNormalAnalysis: 0,
    rnaPublishedTumourAnalysis: 0,
    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,
    alignmentsCompleted: 2,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,
    mutectCompleted: 0,
    mutectRunning: 0,
    mutectFailed: 0,
    openAccessCompleted: 0,
    openAccessRunning: 0,
    openAccessFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: DonorMolecularDataReleaseStatus.NO_RELEASE,
    processingStatus: "REGISTERED",
  },
  DO35228: {
    matchedTNPairsDNA: 0,
    rnaPublishedNormalAnalysis: 0,
    rnaPublishedTumourAnalysis: 0,
    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,
    alignmentsCompleted: 1,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,
    mutectCompleted: 0,
    mutectRunning: 0,
    mutectFailed: 0,
    openAccessCompleted: 0,
    openAccessRunning: 0,
    openAccessFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: DonorMolecularDataReleaseStatus.NO_RELEASE,
    processingStatus: "REGISTERED",
  },
  DO35198: {
    matchedTNPairsDNA: 0,
    rnaPublishedNormalAnalysis: 0,
    rnaPublishedTumourAnalysis: 0,
    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,
    alignmentsCompleted: 1,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,
    mutectCompleted: 0,
    mutectRunning: 0,
    mutectFailed: 0,
    openAccessCompleted: 0,
    openAccessRunning: 0,
    openAccessFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: DonorMolecularDataReleaseStatus.NO_RELEASE,
    processingStatus: "REGISTERED",
  },
};

export const latestRun_expected_1 = {
  runId: "wes-9982753860a7434198a733e9992192ba",
  sessionId: "335663bc-cb5d-45a7-b414-5431869617b5",
  state: "COMPLETE",
  repository: "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
  inputAnalyses: [
    {
      analysisId: "99b3593d-174d-4617-b359-3d174d861714",
    },
    {
      analysisId: "070fd411-1cab-4bff-8fd4-111cabebff9e",
    },
  ],
  producedAnalyses: [
    {
      analysisId: "d970697a-507a-41e3-b069-7a507a81e37d",
    },
    {
      analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b",
    },
  ],
};

export const latestRun_expected_2 = {
  runId: "wes-9982753860a7434198a733e9992192ba",
  sessionId: "335663bc-cb5d-45a7-b414-5431869617b5",
  state: "RUNNING",
  repository: "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
  inputAnalyses: [
    {
      analysisId: "99b3593d-174d-4617-b359-3d174d861714",
    },
    {
      analysisId: "070fd411-1cab-4bff-8fd4-111cabebff9e",
    },
  ],
  producedAnalyses: [
    {
      analysisId: "d970697a-507a-41e3-b069-7a507a81e37d",
    },
    {
      analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b",
    },
  ],
};

export const removeSuppressedAnalyses_expected = [
  {
    analysisId: "63c4653b-f881-4148-8465-3bf8811148c8",
    analysisType: "sequencing_experiment",
    donors: [{ donorId: "DO35102", specimens: [] }],
    runs: [
      {
        runId: "wes-afcd45e183a94f649e6c81fafe4ed6b5",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "63c4653b-f881-4148-8465-3bf8811148c8",
            analysisType: "sequencing_experiment",
          },
        ],
        producedAnalyses: [
          {
            analysisId: "d970697a-507a-41e3-b069-7a507a81e37d",
            analysisState: "PUBLISHED",
            analysisType: "sequencing_alignment",
          },
          {
            analysisId: "55585c52-1c3c-42aa-985c-521c3c52aa4b",
            analysisState: "PUBLISHED",
            analysisType: "qc_metrics",
          },
        ],
      },
    ],
  },

  {
    analysisId: "854f3c1f-8ca3-4aff-8f3c-1f8ca3faff8e",
    analysisType: "sequencing_experiment",
    donors: [{ donorId: "DO35102", specimens: [] }],
    runs: [
      {
        runId: "wes-585b98b1cebb4cb3809017955b4b0042",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "854f3c1f-8ca3-4aff-8f3c-1f8ca3faff8e",
            analysisType: "sequencing_experiment",
          },
        ],
        producedAnalyses: [
          {
            analysisId: "c1692601-4c35-4bf2-a926-014c35ebf259",
            analysisState: "PUBLISHED",
            analysisType: "sequencing_alignment",
          },
          {
            analysisId: "574e2cdc-73fa-4dc6-8e2c-dc73fa5dc64c",
            analysisState: "PUBLISHED",
            analysisType: "qc_metrics",
          },
        ],
      },
    ],
  },
  {
    analysisId: "94684d53-7ec7-4d3e-a84d-537ec7cd3ea9",
    analysisType: "sequencing_experiment",
    donors: [{ donorId: "DO35102", specimens: [] }],
    runs: [],
  },
];

export const analysesWithValidCompleteAndActiveRuns_expected = [
  {
    analysisId: "84c8e815-04f2-4a98-88e8-1504f29a9835",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35148",
        specimens: [],
      },
    ],
    runs: [
      {
        runId: "wes-113b0eba6b7c472a89ce976c341f1fce",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "84c8e815-04f2-4a98-88e8-1504f29a9835",
          },
          {
            analysisId: "d066cd65-d071-4f3f-a6cd-65d071df3fd0",
          },
        ],
        producedAnalyses: [
          {
            analysisId: "7ea869bd-a73c-4bec-a869-bda73c8bec1a",
          },
          {
            analysisId: "d066cd65-d071-4f3f-a6cd-65d071df3fd0",
          },
        ],
      },
      {
        runId: "wes-2c3b0eba6b7c472a89ce976c341f1fce",
        state: RunState.RUNNING,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "84c8e815-04f2-4a98-88e8-1504f29a9835",
          },
          {
            analysisId: "d066cd65-d071-4f3f-a6cd-65d071df3fd0",
          },
        ],
        producedAnalyses: [],
      },
      {
        runId: "wes-8fd46a1e38b24e38a6e2cf18de3e74a9",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "84c8e815-04f2-4a98-88e8-1504f29a9835",
          },
          {
            analysisId: "d066cd65-d071-4f3f-a6cd-65d071df3fd0",
          },
        ],
        producedAnalyses: [],
      },
    ],
  },
];
