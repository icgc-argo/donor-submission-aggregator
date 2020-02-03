import mongoose from "mongoose";
import { Donor } from "./types";

const MONGO_DONOR_MODEL_NAME = "Donor";

export type MongoDonorDocument = mongoose.Document & Donor;

const DonorSchema = new mongoose.Schema<Donor>({}, { strict: false });
export default mongoose.model<MongoDonorDocument>(
  MONGO_DONOR_MODEL_NAME,
  DonorSchema
);
