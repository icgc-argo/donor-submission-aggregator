import { Analysis, RunState } from "rdpc/types";

export const mockSeqExpAnalyses: Analysis[] = [
  {
    analysisId: "ab784c58-39bd-4441-b84c-5839bdf4410f",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35082",
      },
    ],
    runs: [
      {
        runId: "wes-7c5957c2765e485a9fe28e662dd0921c",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "ab784c58-39bd-4441-b84c-5839bdf4410f",
          },
        ],
      },
    ],
  },
  {
    analysisId: "ad10ea81-5431-488b-90ea-815431a88b46",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35083",
      },
    ],
    runs: [
      {
        runId: "wes-065c429407e14301a13c1c7f5507de77",
        state: RunState.EXECUTOR_ERROR,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "ad10ea81-5431-488b-90ea-815431a88b46",
          },
        ],
      },
      {
        runId: "wes-015c429407e14301a13c1c7f5507de77",
        state: RunState.EXECUTOR_ERROR,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "ad10ea81-5431-488b-90ea-815431a88b46",
          },
        ],
      },
    ],
  },
  {
    analysisId: "49ffef9b-5516-43b0-bfef-9b551643b0b7",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35084",
      },
    ],
    runs: [
      {
        runId: "wes-5a3a4e31522349e1a38c62b681fb609e",
        state: RunState.RUNNING,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "49ffef9b-5516-43b0-bfef-9b551643b0b7",
          },
        ],
      },
    ],
  },
  {
    analysisId: "aa7e002c-112e-4929-be00-2c112e1929a8",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35085",
      },
    ],
    runs: [
      {
        runId: "wes-acd31ecc0550444da7e6c8f489901310",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "aa7e002c-112e-4929-be00-2c112e1929a8",
          },
        ],
      },
      {
        runId: "wes-ac231ecc0550444da7e6c8f489901310",
        state: RunState.EXECUTOR_ERROR,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "aa7e002c-112e-4929-be00-2c112e1929a8",
          },
        ],
      },
      {
        runId: "wes-ac331ecc0550444da7e6c8f489901310",
        state: RunState.EXECUTOR_ERROR,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "aa7e002c-112e-4929-be00-2c112e1929a8",
          },
        ],
      },
    ],
  },
  {
    analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35086",
      },
    ],
    runs: [
      {
        runId: "wes-a86e6a76a863402dbb8b86af562d9de0",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c",
          },
        ],
      },
      {
        runId: "wes-c17dfe3890b44f8a8c1fde0b360d3ee5",
        state: RunState.EXECUTOR_ERROR,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c",
          },
        ],
      },
      {
        runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
        state: RunState.EXECUTOR_ERROR,
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
    analysisId: "1683e474-eb84-45ab-83e4-74eb8445abdf",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35087",
      },
    ],
    runs: [
      {
        runId: "wes-6b304126c15447709620988e072c3bf1",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "1683e474-eb84-45ab-83e4-74eb8445abdf",
          },
        ],
      },
    ],
  },
  {
    analysisId: "bec19bda-8264-46b7-819b-da826466b7f1",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35088",
      },
    ],
    runs: [
      {
        runId: "wes-65f2a1a88c4642ffb34ea34b46110643",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "bec19bda-8264-46b7-819b-da826466b7f1",
          },
        ],
      },
    ],
  },
  {
    analysisId: "8948b474-79be-4962-88b4-7479be896233",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35089",
      },
    ],
    runs: [
      {
        runId: "wes-a0776e323d5e4eb49b2c8e9ffce09758",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "8948b474-79be-4962-88b4-7479be896233",
          },
        ],
      },
    ],
  },
  {
    analysisId: "2266826a-2d28-4264-a682-6a2d28a26498",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35090",
      },
    ],
    runs: [
      {
        runId: "wes-97ab483bb5334fdfadcb4b05a4ee334f",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "2266826a-2d28-4264-a682-6a2d28a26498",
          },
        ],
      },
    ],
  },
  {
    analysisId: "3d99d016-e61d-4a3a-99d0-16e61d4a3a1c",
    analysisType: "sequencing_experiment",
    donors: [
      {
        donorId: "DO35091",
      },
    ],
    runs: [
      {
        runId: "wes-e89aa90dd4b242e18f6887876779088a",
        state: RunState.COMPLETE,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "3d99d016-e61d-4a3a-99d0-16e61d4a3a1c",
          },
        ],
      },
      {
        runId: "wes-71c4e6436d934aaa9d0236f325203650",
        state: RunState.EXECUTOR_ERROR,
        repository: "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
        inputAnalyses: [
          {
            analysisId: "3d99d016-e61d-4a3a-99d0-16e61d4a3a1c",
          },
        ],
      },
    ],
  },
];

export const mockSeqAlignmentAnalyses: Analysis[] = [
  {
    analysisId: "e72b062d-f3dc-45dc-ab06-2df3dc75dc4b",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35082",
      },
    ],
    runs: [
      {
        runId: "wes-cd5ee9084062405983f13d4c194f715f",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "381c2685-b3c9-43ae-9c26-85b3c9d3ae5f",
          },
          {
            analysisId: "e72b062d-f3dc-45dc-ab06-2df3dc75dc4b",
          },
        ],
      },
      {
        runId: "wes-4c13fa7083194f0894b160284d23a27f",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "381c2685-b3c9-43ae-9c26-85b3c9d3ae5f",
          },
          {
            analysisId: "e72b062d-f3dc-45dc-ab06-2df3dc75dc4b",
          },
        ],
      },
      {
        runId: "wes-90566cb4afc74ae7a0d95091605127fa",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "991c2685-b3c9-43ae-9c26-85b3c9d3ae5f",
          },
          {
            analysisId: "e72b062d-f3dc-45dc-ab06-2df3dc75dc4b",
          },
        ],
      },
      {
        runId: "wes-875bb22e298c480297ea490f388a5896",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "991c2685-b3c9-43ae-9c26-85b3c9d3ae5f",
          },
          {
            analysisId: "e72b062d-f3dc-45dc-ab06-2df3dc75dc4b",
          },
        ],
      },
    ],
  },
  {
    analysisId: "4b2778e0-bf6a-4d5e-a778-e0bf6a2d5ef3",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35083",
      },
    ],
    runs: [
      {
        runId: "wes-4256dda180b54714bff6b25b7b33ba46",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "a0622438-055e-4437-a224-38055e043753",
          },
          {
            analysisId: "4b2778e0-bf6a-4d5e-a778-e0bf6a2d5ef3",
          },
        ],
      },
      {
        runId: "wes-11cc667a939f4bb3a8cecc9e91505520",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "a0622438-055e-4437-a224-38055e043753",
          },
          {
            analysisId: "4b2778e0-bf6a-4d5e-a778-e0bf6a2d5ef3",
          },
        ],
      },
      {
        runId: "wes-c714d4be7e124fa196768dbcef7c0ab5",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "a0622438-055e-4437-a224-38055e043753",
          },
          {
            analysisId: "4b2778e0-bf6a-4d5e-a778-e0bf6a2d5ef3",
          },
        ],
      },
      {
        runId: "wes-f0d5cb8062f24632b82d48794fd7b939",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "a0622438-055e-4437-a224-38055e043753",
          },
          {
            analysisId: "4b2778e0-bf6a-4d5e-a778-e0bf6a2d5ef3",
          },
        ],
      },
    ],
  },
  {
    analysisId: "5d98d3af-251d-4f52-98d3-af251d4f5209",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35084",
      },
    ],
    runs: [
      {
        runId: "wes-df8539b1bdbb4845b282f0c126fcc89d",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "5d98d3af-251d-4f52-98d3-af251d4f5209",
          },
          {
            analysisId: "db764a17-b0de-456c-b64a-17b0de256cd6",
          },
        ],
      },
    ],
  },
  {
    analysisId: "852c6beb-ff39-4976-ac6b-ebff391976df",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35085",
      },
    ],
    runs: [
      {
        runId: "wes-4dda7f0058a449f99e35207330176472",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "268e0ab9-f20a-4bc3-8e0a-b9f20abbc366",
          },
          {
            analysisId: "852c6beb-ff39-4976-ac6b-ebff391976df",
          },
        ],
      },
    ],
  },
  {
    analysisId: "49ac191f-6435-42c6-ac19-1f6435c2c630",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35086",
      },
    ],
    runs: [
      {
        runId: "wes-40dc312b760b4d3180404b864c62ee0a",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "49ac191f-6435-42c6-ac19-1f6435c2c630",
          },
          {
            analysisId: "e1512c8e-0274-426e-912c-8e0274526e4f",
          },
        ],
      },
    ],
  },
  {
    analysisId: "29ab71c8-ea17-47c2-ab71-c8ea1787c2a4",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35087",
      },
    ],
    runs: [
      {
        runId: "wes-fc671df52c5f490086baaae52d0cefcf",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "290fe4ab-9abc-4eab-8fe4-ab9abc9eab8f",
          },
          {
            analysisId: "29ab71c8-ea17-47c2-ab71-c8ea1787c2a4",
          },
        ],
      },
    ],
  },
  {
    analysisId: "6e1ce8fb-3335-4f25-9ce8-fb33353f256a",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35088",
      },
    ],
    runs: [
      {
        runId: "wes-7c9d31c50811438196c4edec81d1a3f5",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "c77d2fbf-5450-415e-bd2f-bf5450515e84",
          },
          {
            analysisId: "6e1ce8fb-3335-4f25-9ce8-fb33353f256a",
          },
        ],
      },
    ],
  },
  {
    analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35089",
      },
    ],
    runs: [
      {
        runId: "wes-4a97737e3c874699a0ecbbc97d582713",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-98732019728c4cd9ba2d914835750e40",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-dc4dc838e43b4f2db70e3e79049ad9ed",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-afeaf41762424ad7b01c18ff06227d8f",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/gatk-mutect2-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-cadb4fe67ea948be9bac7b09dda8db22",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-a2835112ba294d21986743b4f822f4e0",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-7741f550a1f84253a36318c5a6ecdcb8",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-4871432e547d45a6885ee27acbab304e",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-b025ac8d68f5442c8a88bce8329a280e",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
      {
        runId: "wes-d381791481b14f25a878b940674e6f12",
        state: RunState.EXECUTOR_ERROR,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "43fd2c55-d9e1-40df-bd2c-55d9e130dfa3",
          },
          {
            analysisId: "aaffcbcf-827c-4f6d-bfcb-cf827c0f6dd8",
          },
        ],
      },
    ],
  },
  {
    analysisId: "7bddc11a-3033-489f-9dc1-1a3033b89f97",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35090",
      },
    ],
    runs: [
      {
        runId: "wes-2d28024d8ab94fe39ab189db1d7735af",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "7bddc11a-3033-489f-9dc1-1a3033b89f97",
          },
          {
            analysisId: "356e8e2e-7fe6-4dd8-ae8e-2e7fe64dd8b0",
          },
        ],
      },
    ],
  },
  {
    analysisId: "290fe4ab-9abc-4eab-8fe4-ab9abc9eab8f",
    analysisType: "sequencing_alignment",
    donors: [
      {
        donorId: "DO35091",
      },
    ],
    runs: [
      {
        runId: "wes-fc671df52c5f490086baaae52d0cefcf",
        state: RunState.COMPLETE,
        repository:
          "https://github.com/icgc-argo/sanger-wgs-variant-calling.git",
        inputAnalyses: [
          {
            analysisId: "290fe4ab-9abc-4eab-8fe4-ab9abc9eab8f",
          },
          {
            analysisId: "29ab71c8-ea17-47c2-ab71-c8ea1787c2a4",
          },
        ],
      },
    ],
  },
];