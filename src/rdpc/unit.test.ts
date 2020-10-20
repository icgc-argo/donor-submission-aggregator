import { expect } from "chai";
import {
  donorStateMap,
  mergeDonorMaps,
  toDonorCentric,
} from "rdpc/analysesProcessor";
import {
  donorCentric_page_1_exptected,
  donorCentric_page_2_exptected,
  donorStateMap_expected,
  mergedPage_expected,
} from "./fixtures/expectedResults";
import {
  mergedPagesDonorStateMap,
  seqAlignAnalysesWithMultipleTNPairs_page_1,
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

    const allMerged = await mergeDonorMaps(
      donorCentric_page_1,
      donorCentric_page_2
    );
    expect(JSON.stringify(allMerged)).to.equal(
      JSON.stringify(mergedPage_expected)
    );
  });

  it("converts and merges sequencing alignment analyses to a donor document map", async () => {
    const donorCentric_page_1 = toDonorCentric(
      seqAlignAnalysesWithMultipleTNPairs_page_1
    );
  });

  it.only("should count the latest run state for each donor", async () => {
    const donorState = donorStateMap(mergedPagesDonorStateMap);
    expect(JSON.stringify(donorState)).to.equal(
      JSON.stringify(donorStateMap_expected)
    );
  });
});
