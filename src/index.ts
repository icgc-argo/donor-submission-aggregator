import indexProgram from "indexProgram";
import rollCall from "rollCall";
import { initIndexMappping } from "elasticsearch";

(async () => {
  const programShortName = "TEST_PROGRAM";
  const newIndexName = await rollCall.getNewIndexName(
    programShortName.toLowerCase()
  );
  await initIndexMappping(newIndexName);
  await indexProgram(programShortName, newIndexName);
  await rollCall.release(newIndexName);
})();
