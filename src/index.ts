import indexProgram from "indexProgram";
import rollCall from "rollCall";
import { initIndexMappping } from "elasticsearch";
import dotenv from "dotenv";
import connectMongo from "connectMongo";
import mongoose from "mongoose";

dotenv.config();

(async () => {
  await connectMongo();
  const programShortName = "DASH-CA";
  const newIndexName = await rollCall.getNewIndexName(
    programShortName.toLowerCase()
  );
  await initIndexMappping(newIndexName);
  await indexProgram(programShortName, newIndexName);
  await rollCall.release(newIndexName);
  await mongoose.disconnect();
})();
