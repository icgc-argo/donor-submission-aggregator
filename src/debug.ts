import { ROLLCALL_SERVICE_ROOT } from "config";
import { createEsClient, initIndexMapping } from "elasticsearch";
import _ from "lodash";
import { indexRdpcData } from "rdpc";
import createRollCallClient from "rollCall";

const debug = async () => {
  const TEST_PROGRAM = "TEST_1";
  const url = "https://api.rdpc-qa.cancercollaboratory.org/graphql";
  // const client = await createEsClient();
  // initIndexMapping(TEST_PROGRAM, client);
  // indexRdpcData("PACA-CA", url, "test_1", client);
};

debug();
