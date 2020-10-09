import {
  analysisStream,
  indexRdpc,
  toDonorCentric,
  mergeDonorMaps,
  fetchSeqExpAnalyses,
  getAllMergedDonor,
  donorStateMap,
} from "./index";
import { STREAM_CHUNK_SIZE } from "config";
import logger from "logger";
import {
  Analysis,
  Donor,
  DonorDoc,
  DonorDocMap,
  DonorRunStateMap,
  Run,
} from "./types";
import _ from "lodash";
import {
  seqExpAnalysesWithMultipleRuns_page_1,
  seqExpAnalysesWithMultipleRuns_page_2,
} from "./testData";

const run = async () => {
  // test 1
  // const data = await fetchSeqExpAnalyses('PACA-CA', 0, 10);
  // console.log(data);

  // test 2:
  // const config = { chunkSize: 10};
  // const stream = await analysisStream('PACA-CA',config);

  // for await (const page of stream) {
  //   const donorAlignmentRunsMap = toDonorCentric(page);

  //   // console.log(`streaming ${chunk.sequencingAlignmentAnalyses.length} RDPC sequencingAlignmentAnalyses: ----------` +
  //     // chunk.sequencingAlignmentAnalyses);

  //     // console.log(`streaming ${chunk.sequencingExperimentAnalyses.length } RDPC sequencingExperimentAnalyses: -----------` +
  //     // chunk.sequencingExperimentAnalyses)
  //   console.log('converted alignment donors map : ' + JSON.stringify(donorAlignmentRunsMap));
  //   console.log('------------------------');
  // }

  // test 3:
  const donorCentric_page_1 = toDonorCentric(
    seqExpAnalysesWithMultipleRuns_page_1
  );

  // console.log("donor centric page 1 --------" + JSON.stringify(donorCentric_page_1));

  const donorCentric_page_2 = toDonorCentric(
    seqExpAnalysesWithMultipleRuns_page_2
  );
  // console.log("donor centric page 2 --------" + JSON.stringify(donorCentric_page_2));

  // test 4: test mergeDonorMaps;

  const mergedMap = mergeDonorMaps(donorCentric_page_1, donorCentric_page_2);
  // console.log('merged page ------' + JSON.stringify(mergedMap));

  // test getAllMergedDonor
  const config = { chunkSize: 10 };
  const allMerged = await getAllMergedDonor("PACA-CA", config);
  // console.log('all merged map ---------' + JSON.stringify(allMerged));

  const donorState = donorStateMap(allMerged);
  console.log(JSON.stringify(donorState));
};

run();
