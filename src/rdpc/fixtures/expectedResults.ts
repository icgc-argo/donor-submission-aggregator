export const donorCentric_page_1_exptected = {
  DO35222: {
    donorId: "DO35222",
    runs: [
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" }],
      },
    ],
  },
  DO35228: {
    donorId: "DO35228",
    runs: [
      {
        runId: "wes-ff9ac3f9d7dc41f4abce9c015077d949",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b" }],
      },
    ],
  },
};

export const donorCentric_page_2_exptected = {
  DO35198: {
    donorId: "DO35198",
    runs: [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
      },
    ],
  },
  DO35222: {
    donorId: "DO35222",
    runs: [
      {
        runId: "wes-4b90558cd2a54592bb1dfce7310d8f6b",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03" }],
      },
    ],
  },
};

// Expected result of function mergeDonorMaps():
export const mergedPage_expected = {
  DO35222: {
    donorId: "DO35222",
    runs: [
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" }],
      },
      {
        runId: "wes-4b90558cd2a54592bb1dfce7310d8f6b",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03" }],
      },
    ],
  },
  DO35228: {
    donorId: "DO35228",
    runs: [
      {
        runId: "wes-ff9ac3f9d7dc41f4abce9c015077d949",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b" }],
      },
    ],
  },
  DO35198: {
    donorId: "DO35198",
    runs: [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "17297f22-3397-420c-a97f-223397220c2f" }],
      },
    ],
  },
};

export const donorStateMap_expected = {
  DO35222: {
    alignmentsCompleted: 2,
    alignmentsRunning: 1,
    alignmentsFailed: 1,
  },
  DO35228: {
    alignmentsCompleted: 0,
    alignmentsRunning: 2,
    alignmentsFailed: 2,
  },
  DO35198: {
    alignmentsCompleted: 1,
    alignmentsRunning: 0,
    alignmentsFailed: 0,
  },
};
