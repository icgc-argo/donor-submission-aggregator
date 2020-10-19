export const donorCentric_page_1_exptected = {
  DO35222: {
    "3bc5d782-70ba-4f84-8cca-3e63f26d0c55": [
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
    "951e6b51-06d4-4281-a204-b7d2f23b090c": [
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
    "29bf4110-757b-4ee8-aeb1-942f02b201be": [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        sessionId: "29bf4110-757b-4ee8-aeb1-942f02b201be",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
      },
    ],
    "77bf4110-757b-4ee8-aeb1-942f02b201be": [
      {
        runId: "wes-9f16f80bcec64565a65a641edf0206c2",
        state: "RUNNING",
        sessionId: "77bf4110-757b-4ee8-aeb1-942f02b201be",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
      },
    ],
  },
  DO35222: {
    "34c5d782-70ba-4f84-8cca-3e63f26d0c55": [
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
    "3bc5d782-70ba-4f84-8cca-3e63f26d0c55": [
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        sessionId: "3bc5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" }],
      },
    ],
    "34c5d782-70ba-4f84-8cca-3e63f26d0c55": [
      {
        runId: "wes-4b90558cd2a54592bb1dfce7310d8f6b",
        state: "COMPLETE",
        sessionId: "34c5d782-70ba-4f84-8cca-3e63f26d0c55",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03" }],
      },
    ],
  },
  DO35228: {
    "951e6b51-06d4-4281-a204-b7d2f23b090c": [
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
    "29bf4110-757b-4ee8-aeb1-942f02b201be": [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        sessionId: "29bf4110-757b-4ee8-aeb1-942f02b201be",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
      },
    ],
    "77bf4110-757b-4ee8-aeb1-942f02b201be": [
      {
        runId: "wes-9f16f80bcec64565a65a641edf0206c2",
        state: "RUNNING",
        sessionId: "77bf4110-757b-4ee8-aeb1-942f02b201be",
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
    alignmentsRunning: 1,
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
