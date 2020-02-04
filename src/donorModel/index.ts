import mongoose from "mongoose";
import { Donor } from "./types";

const MONGO_DONOR_MODEL_NAME = "Donor";

export type MongoDonorDocument = Donor;

export const toJson = (
  doc: mongoose.Document & MongoDonorDocument
): MongoDonorDocument => doc.toJSON();

const DonorSchema = new mongoose.Schema<Donor>({}, { strict: false });
export default mongoose.model<mongoose.Document & MongoDonorDocument>(
  MONGO_DONOR_MODEL_NAME,
  DonorSchema
);
