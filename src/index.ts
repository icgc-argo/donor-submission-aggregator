import indexProgram from "indexProgram";
import rollCall from "rollCall";
import { initIndexMappping } from "elasticsearch";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  const programShortName = "TEST_PROGRAM";
  const newIndexName = await rollCall.getNewIndexName(
    programShortName.toLowerCase()
  );
  await initIndexMappping(newIndexName);
  await indexProgram(programShortName, newIndexName);
  await rollCall.release(newIndexName);
})();
