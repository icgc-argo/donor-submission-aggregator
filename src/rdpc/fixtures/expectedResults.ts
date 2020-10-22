export const donorCentric_page_1_exptected = {
  DO35222: {
    "-2571731288": [
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        sessionId: "3bc5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" }],
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
      },
    ],
  },
};

export const donorCentric_page_2_exptected = {
  DO35198: {
    "-1864409666": [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        sessionId: "29bf4110-757b-4ee8-aeb1-942f02b201be",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
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
      },
    ],
    "-2571731288": [
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        sessionId: "3bc5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" }],
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
      },
    ],
  },
};

export const donorStateMap_expected = {
  DO35222: {
    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,
    alignmentsCompleted: 2,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: "NO_RELEASE",
    processingStatus: "REGISTERED",
  },
  DO35228: {
    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,
    alignmentsCompleted: 1,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: "NO_RELEASE",
    processingStatus: "REGISTERED",
  },
  DO35198: {
    publishedNormalAnalysis: 0,
    publishedTumourAnalysis: 0,
    alignmentsCompleted: 1,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
    sangerVcsCompleted: 0,
    sangerVcsRunning: 0,
    sangerVcsFailed: 0,
    totalFilesCount: 0,
    filesToQcCount: 0,
    releaseStatus: "NO_RELEASE",
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
};

export const donorCentricWithMultipleTNPairs_page_1 = {
  DO50339: {
    "820885243": [
      {
        runId: "wes-80a14eef2b2d47c48e08bbf5dbdce09d",
        state: "RUNNING",
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          { analysisId: "2cb3593d-174d-4617-b359-3d174d861714" },
          { analysisId: "990fd411-1cab-4bff-8fd4-111cabebff9e" },
        ],
      },
    ],
    "-582135718": [
      {
        runId: "wes-310c2500a5b54e6a925ddb922812d580",
        state: "COMPLETE",
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          { analysisId: "2cb3593d-174d-4617-b359-3d174d861714" },
          { analysisId: "070fd411-1cab-4bff-8fd4-111cabebff9e" },
        ],
      },
    ],
    "-1768359391": [
      {
        runId: "wes-9e31b9a4564444cd8eba0996ae4ee542",
        state: "EXECUTOR_ERROR",
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          { analysisId: "2cb3593d-174d-4617-b359-3d174d861714" },
          { analysisId: "110fd411-1cab-4bff-8fd4-111cabebff9e" },
        ],
      },
    ],
  },
};
