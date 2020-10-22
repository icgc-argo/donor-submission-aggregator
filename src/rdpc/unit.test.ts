import { expect } from "chai";
import {
  donorStateMap,
  getLatestRun,
  getAllRunsByAnalysesByDonors,
  toDonorCentric,
} from "rdpc/analysesProcessor";
import {
  donorCentricWithMultipleTNPairs_page_1,
  donorCentric_page_1_exptected,
  donorCentric_page_2_exptected,
  donorStateMap_expected,
  latestRun_expected_1,
  mergedPage_expected,
} from "./fixtures/expectedResults";
import {
  mergedPagesDonorStateMap,
  runsWithMultipleStates_1,
  runsWithMultipleStates_2,
  seqAlignAnalysesWithMultiTNPairs_page_1,
  seqExpAnalysesWithMultipleRuns_page_1,
  seqExpAnalysesWithMultipleRuns_page_2,
} from "./fixtures/testData";

describe("RDPC data processing", () => {
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

  it("should count the latest run state for each donor", async () => {
    const donorState = donorStateMap(mergedPagesDonorStateMap);
    expect(JSON.stringify(donorState)).to.equal(
      JSON.stringify(donorStateMap_expected)
    );
  });

  it("should convert sequencing alignment analyses to donor centric map", async () => {
    const donorCentric_page_1 = toDonorCentric(
      seqAlignAnalysesWithMultiTNPairs_page_1
    );
    expect(JSON.stringify(donorCentric_page_1)).to.equal(
      JSON.stringify(donorCentricWithMultipleTNPairs_page_1)
    );
  });
});
