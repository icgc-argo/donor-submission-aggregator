import mongoose from "mongoose";
import { Donor } from "./types";

const MONGO_DONOR_MODEL_NAME = "Donor";

type TumourNormalDesignation = "Normal" | "Tumour";
export type MongoDonorDocument = Omit<Donor, "specimens"> & {
  donorId: NonNullable<Donor["donorId"]>;
  createdAt: NonNullable<Donor["createdAt"]>;
  updatedAt: NonNullable<Donor["updatedAt"]>;
  specimens: Array<
    Donor["specimens"][0] & {
      tumourNormalDesignation: TumourNormalDesignation;
    }
  >;
};

export const toJson = (
  doc: mongoose.Document & MongoDonorDocument
): MongoDonorDocument => doc.toJSON() as MongoDonorDocument;

const DonorSchema = new mongoose.Schema<mongoose.Document<Donor>>(
  {},
  { strict: false }
);
export default () =>
  mongoose.model<mongoose.Document & MongoDonorDocument>(
    MONGO_DONOR_MODEL_NAME,
    DonorSchema
  );
