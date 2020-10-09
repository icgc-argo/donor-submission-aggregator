export const seqExpAnalysesWithMultipleRuns_page_1 = [
  {
    analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c",
    analysisType: "sequencing_experiment",
    studyId: "PACA-CA",
    donors: [
      {
        donorId: "DO35222",
      },
    ],
    runs: [
      {
        runId: "wes-a86e6a76a863402dbb8b86af562d9de0",
        state: "EXECUTOR_ERRPR",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c",
          },
        ],
      },
      {
        runId: "wes-c17dfe3890b44f8a8c1fde0b360d3ee5",
        state: "RUNNING",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c",
          },
        ],
      },
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c",
          },
        ],
      },
    ],
  },
  {
    analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b",
    analysisType: "sequencing_experiment",
    studyId: "PACA-CA",
    donors: [
      {
        donorId: "DO35228",
      },
    ],
    runs: [
      {
        runId: "wes-ff9ac3f9d7dc41f4abce9c015077d949",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b",
          },
        ],
      },
      {
        runId: "wes-b505bee0881345da8bb18cc9ec60df61",
        state: "EXECUTOR_ERROR",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b",
          },
        ],
      },
    ],
  },
];

export const seqExpAnalysesWithMultipleRuns_page_2 = [
  {
    analysisId: "17297f22-3397-420c-a97f-223397220c2f",
    analysisType: "sequencing_experiment",
    studyId: "PACA-CA",
    donors: [
      {
        donorId: "DO35198",
      },
    ],
    runs: [
      {
        runId: "wes-1c19f8cb06dd4b8ea29b296ad9679517",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "17297f22-3397-420c-a97f-223397220c2f",
          },
        ],
      },
      {
        runId: "wes-e316f80bcec64565a65a641edf0206c2",
        state: "EXECUTOR_ERROR",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "17297f22-3397-420c-a97f-223397220c2f",
          },
        ],
      },
    ],
  },
  {
    analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03",
    analysisType: "sequencing_experiment",
    studyId: "PACA-CA",
    donors: [
      {
        donorId: "DO35222",
      },
    ],
    runs: [
      {
        runId: "wes-4b90558cd2a54592bb1dfce7310d8f6b",
        state: "COMPLETE",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03",
          },
        ],
      },
      {
        runId: "wes-f44500799eae4b34bef25c9275cfc2a1",
        state: "EXECUTOR_ERROR",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03",
          },
        ],
      },
    ],
  },
];

// input test data for donorStateMap():
export const mergedPagesDonorStateMap = {
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
      {
        runId: "wes-9990558cd2a54592bb1dfce7310d8f6b",
        state: "RUNNING",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03" }],
      },
      {
        runId: "wes-8790558cd2a54592bb1dfce7310d8f6b",
        state: "EXECUTOR_ERROR",
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
        state: "RUNNING",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b" }],
      },
      {
        runId: "wes-f09ac3f9d7dc41f4abce9c015077d949",
        state: "EXECUTOR_ERROR",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b" }],
      },
      {
        runId: "wes-119ac3f9d7dc41f4abce9c015077d949",
        state: "EXECUTOR_ERROR",
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [{ analysisId: "ac11f7ea-5fef-46be-91f7-ea5fefd6be8b" }],
      },
      {
        runId: "wes-129ac3f9d7dc41f4abce9c015077d949",
        state: "RUNNING",
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
