import { expect } from "chai";
import { SANGER_VC_REPO_URL, SEQ_ALIGN_REPO_URL } from "config";
import { createEsClient } from "elasticsearch";
import { url } from "inspector";
import { indexRdpcData } from "rdpc";
import {
  getLatestRun,
  getAllRunsByAnalysesByDonors,
  toDonorCentric,
  countAlignmentRunState,
  countVCRunState,
  analysisStream,
  fetchAnalyses,
  getAllMergedDonor,
} from "rdpc/analysesProcessor";
import {
  donorByVCRunState,
  donorCentricWithMultipleTNPairs_page_1,
  donorCentricWithMultipleTNPairs_page_2,
  donorCentricWithOneTNPair,
  mergedDonorByAlignRuns,
} from "./fixtures/SeqAlignAnalyses/exptectedResults";
import {
  mergedDonorByInputAnalyses,
  seqAlignAnalysesWithMultiTNPairs_page_1,
  seqAlignAnalysesWithMultiTNPairs_page_2,
  seqAlignAnalysesWithOneTNPairs,
} from "./fixtures/SeqAlignAnalyses/testData";
import {
  donorCentric_page_1_exptected,
  donorCentric_page_2_exptected,
  donorStateMap_expected,
  latestRun_expected_1,
  mergedPage_expected,
} from "./fixtures/SeqExpAnalyses/expectedResults";
import {
  mergedPagesDonorStateMap,
  runsWithMultipleStates_1,
  runsWithMultipleStates_2,
  seqExpAnalysesWithMultipleRuns_page_1,
  seqExpAnalysesWithMultipleRuns_page_2,
} from "./fixtures/SeqExpAnalyses/testData";
import { Analysis, AnalysisType, RunState } from "./types";

describe("RDPC sequencing experiment analyses processing", () => {
  it("converts and merges sequencing experiment analyses to a donor document map", async () => {
    const donorCentric_page_1 = toDonorCentric(
      seqExpAnalysesWithMultipleRuns_page_1
    );

    expect(JSON.stringify(donorCentric_page_1)).to.equal(
      JSON.stringify(donorCentric_page_1_exptected)
    );

    const donorCentric_page_2 = toDonorCentric(
      seqExpAnalysesWithMultipleRuns_page_2
    );
    expect(JSON.stringify(donorCentric_page_2)).to.equal(
      JSON.stringify(donorCentric_page_2_exptected)
    );

    const allMerged = await getAllRunsByAnalysesByDonors(
      donorCentric_page_1,
      donorCentric_page_2
    );
    expect(JSON.stringify(allMerged)).to.equal(
      JSON.stringify(mergedPage_expected)
    );
  });

  it("should return the latest run", async () => {
    const latestRun_1 = getLatestRun(runsWithMultipleStates_1);
    expect(JSON.stringify(latestRun_1)).to.equal(
      JSON.stringify(latestRun_expected_1)
    );

    const latestRun_2 = getLatestRun(runsWithMultipleStates_2);
    expect(JSON.stringify(latestRun_2)).to.equal(JSON.stringify(latestRun_2));
  });

  it("should count the latest alignment run state for each donor", async () => {
    const donorState = countAlignmentRunState(mergedPagesDonorStateMap);
    expect(JSON.stringify(donorState)).to.equal(
      JSON.stringify(donorStateMap_expected)
    );
  });
});

describe("RDPC sequencing alignment analyses processing", () => {
  it(
    "should not convert repeated sequencing alignment analysis, it should " +
      "group analyses by unique input analyses pair",
    async () => {
      const converted = toDonorCentric(seqAlignAnalysesWithOneTNPairs);
      expect(JSON.stringify(converted)).to.equal(
        JSON.stringify(donorCentricWithOneTNPair)
      );
    }
  );

  it("should convert sequencing alignment analyses to donor centric map", async () => {
    const donorCentric_page_1 = toDonorCentric(
      seqAlignAnalysesWithMultiTNPairs_page_1
    );
    expect(JSON.stringify(donorCentric_page_1)).to.equal(
      JSON.stringify(donorCentricWithMultipleTNPairs_page_1)
    );

    const donorCentric_page_2 = toDonorCentric(
      seqAlignAnalysesWithMultiTNPairs_page_2
    );
    expect(JSON.stringify(donorCentric_page_2)).to.equal(
      JSON.stringify(donorCentricWithMultipleTNPairs_page_2)
    );

    const mergedPages = getAllRunsByAnalysesByDonors(
      donorCentric_page_1,
      donorCentric_page_2
    );
    expect(JSON.stringify(mergedPages)).to.equal(
      JSON.stringify(mergedDonorByAlignRuns)
    );
  });

  it("should count the latest sanger VC run state for each donor", async () => {
    const donorState = countVCRunState(mergedDonorByInputAnalyses);
    expect(JSON.stringify(donorState)).to.equal(
      JSON.stringify(donorByVCRunState)
    );
  });
});

describe("should index RDPC analyses to donor index", () => {
  it("should index ", async () => {
    const mockData: Analysis[] = [
      {
        analysisId: "ab784c58-39bd-4441-b84c-5839bdf4410f",
        analysisType: "sequencing_experiment",
        donors: [
          {
            donorId: "DO35152",
          },
        ],
        runs: [
          {
            runId: "wes-7c5957c2765e485a9fe28e662dd0921c",
            state: RunState.COMPLETE,
            repository:
              "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
            inputAnalyses: [
              {
                analysisId: "ab784c58-39bd-4441-b84c-5839bdf4410f",
              },
            ],
          },
        ],
      },
    ];

    const mockedMergedDonors_alignment = {
      DO35222: {
        "1047747475": [
          {
            runId: "wes-4b90558cd2a54592bb1dfce7310d8f6b",
            state: RunState.COMPLETE,
            sessionId: "34c5d782-70ba-4f84-8cca-3e63f26d0c55",
            repository:
              "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
            inputAnalyses: [
              { analysisId: "e5c7894c-6490-46cf-8789-4c6490b6cf03" },
            ],
          },
        ],
        "-2571731288": [
          {
            runId: "wes-5aba793db9144a89a0fc8658f5671fb4",
            state: RunState.COMPLETE,
            sessionId: "3bc5d782-70ba-4f84-8cca-3e63f26d0c55",
            repository:
              "https://github.com/icgc-argo/dna-seq-processing-wfs.git",
            inputAnalyses: [
              { analysisId: "abd8e25c-263d-4588-98e2-5c263db5882c" },
            ],
          },
        ],
      },
    };

    const mockFetchAnalyses: typeof fetchAnalyses = () =>
      Promise.resolve(mockData);

    const mockGetAllMergedDonor_alignment: typeof getAllMergedDonor = () =>
      Promise.resolve(mockedMergedDonors_alignment);

    const mockGetAllMergedDonor_sanger: typeof getAllMergedDonor = () =>
      Promise.resolve(mergedDonorByInputAnalyses);

    const studyId = "PACA-CA";
    const url = "https://api.rdpc-qa.cancercollaboratory.org/graphql";
    const analysisType = AnalysisType.SEQ_EXPERIMENT;
    const config = { chunkSize: 10 };
    const indexName = "test";
    const client = await createEsClient();

    indexRdpcData(
      studyId,
      url,
      indexName,
      client,
      mockGetAllMergedDonor_alignment,
      mockGetAllMergedDonor_sanger
    );
  });

  // const analysisStream = async function* (
  //   studyId: string,
  //   rdpcUrl: string,
  //   analysisType: string,
  //   config?: {
  //     chunkSize?: number;
  //     state?: StreamState;
  //   }
  // ): AsyncGenerator<Analysis[]> {
  //   const chunkSize = config?.chunkSize || 1000;
  //   const streamState: StreamState = {
  //     currentPage: config?.state?.currentPage || 0,
  //   };

  //   const workflowRepoUrl = analysisType === AnalysisType.SEQ_ALIGNMENT ? SANGER_VC_REPO_URL : SEQ_ALIGN_REPO_URL;

  //   while (true) {
  //     const page = await mockFetchAnalyses();
  //     // await fetchAnalyses(
  //     //   studyId,
  //     //   rdpcUrl,
  //     //   workflowRepoUrl,
  //     //   analysisType,
  //     //   streamState.currentPage,
  //     //   chunkSize
  //     // );

  //     streamState.currentPage = streamState.currentPage + chunkSize;

  //     if (page && page.length > 0) {
  //       yield page;
  //     } else {
  //       break;
  //     }
  //   }
  // };
});
