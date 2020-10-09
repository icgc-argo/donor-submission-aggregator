import {
  analysisStream,
  toDonorCentric,
  mergeDonorMaps,
  fetchSeqExpAnalyses,
  getAllMergedDonor,
  donorStateMap,
} from "./rdpc/analysesProcessor";
import logger from "logger";
import {
  Analysis,
  Donor,
  DonorDoc,
  DonorDocMap,
  DonorRunStateMap,
  Run,
} from "./rdpc/types";
import _ from "lodash";
import {
  mergedPagesDonorStateMap,
  seqExpAnalysesWithMultipleRuns_page_1,
  seqExpAnalysesWithMultipleRuns_page_2,
} from "./rdpc/fixtures/testData";

import { mergedPage_expected } from "./rdpc/fixtures/expectedResults";
import { Client } from "@elastic/elasticsearch";
import { indexRdpcData } from "./rdpc/index";
import { createEsClient } from "elasticsearch";

const run = async () => {
  // test 1
  // const data = await fetchSeqExpAnalyses('PACA-CA', 0, 10);
  // console.log(data);

  // test 3:
  // const donorCentric_page_1 = toDonorCentric(
  // seqExpAnalysesWithMultipleRuns_page_1
  // );

  // console.log("donor centric page 1 --------" + JSON.stringify(donorCentric_page_1));

  // const donorCentric_page_2 = toDonorCentric(
  // seqExpAnalysesWithMultipleRuns_page_2
  // );
  // console.log("donor centric page 2 --------" + JSON.stringify(donorCentric_page_2));

  // test 4: test mergeDonorMaps;
  // const mergedMap = mergeDonorMaps(donorCentric_page_1, donorCentric_page_2);
  // console.log('merged page ------' + JSON.stringify(mergedMap));

  // test5: getAllMergedDonor
  // const config = { chunkSize: 10 };
  // const allMerged = await getAllMergedDonor("PACA-CA", config);
  // console.log('all merged map ---------' + JSON.stringify(allMerged));

  // test 6:
  // const donorState = donorStateMap(mergedPagesDonorStateMap);
  // console.log('donor state map -------- ' + JSON.stringify(donorState));

  const esClient = await createEsClient();
  const url = "https://api.rdpc.cancercollaboratory.org/graphql";
  indexRdpcData("PACA-CA", url, "donorDashboard", esClient);
};

run();
