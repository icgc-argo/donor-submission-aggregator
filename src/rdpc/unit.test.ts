import { expect } from "chai";
import {
  getLatestRun,
  getAllRunsByAnalysesByDonors,
  toDonorCentric,
  countAlignmentRunState,
  countVCRunState,
  removeCompleteRunsWithSuppressedAnalyses,
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
  analysesWithValidCompleteAndActiveRuns_expected,
  donorCentric_page_1_exptected,
  donorCentric_page_2_exptected,
  donorStateMap_expected,
  latestRun_expected_1,
  mergedPage_expected,
  removeSuppressedAnalyses_expected,
} from "./fixtures/SeqExpAnalyses/expectedResults";
import {
  analysesWithActiveRunsOnly,
  analysesWithEmptyProducedAnalyses,
  analysesWithValidCompleteAndActiveRuns,
  mergedPagesDonorStateMap,
  runsWithMultipleStates_1,
  runsWithMultipleStates_2,
  seqExpAnalysesWithMultipleRuns_page_1,
  seqExpAnalysesWithMultipleRuns_page_2,
} from "./fixtures/SeqExpAnalyses/testData";
describe("RDPC sequencing experiment analyses processing", () => {
  it("should remove COMPLETE runs with SUPPRESSED producedAnalyses ", () => {
    const result = removeCompleteRunsWithSuppressedAnalyses(
      analysesWithEmptyProducedAnalyses
    );
    expect(JSON.stringify(result)).to.equal(
      JSON.stringify(removeSuppressedAnalyses_expected)
    );
  });

  it("should not remove RUNNING AND EXECTOR_ERROR runs", () => {
    const result_1 = removeCompleteRunsWithSuppressedAnalyses(
      analysesWithActiveRunsOnly
    );
    expect(JSON.stringify(result_1)).to.equal(
      JSON.stringify(analysesWithActiveRunsOnly)
    );

    const result_2 = removeCompleteRunsWithSuppressedAnalyses(
      analysesWithValidCompleteAndActiveRuns
    );
    expect(JSON.stringify(result_2)).to.equal(
      JSON.stringify(analysesWithValidCompleteAndActiveRuns_expected)
    );
  });

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
