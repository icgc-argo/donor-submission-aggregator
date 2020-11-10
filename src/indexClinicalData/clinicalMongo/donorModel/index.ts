import mongoose from "mongoose";
import { Donor, Donor_new } from "./types";

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

export type LocalMongoDonorDocument = Omit<Donor_new, "specimens"> & {
  donorId: NonNullable<Donor_new["donorId"]>;
  createdAt: NonNullable<Donor_new["createdAt"]>;
  updatedAt: NonNullable<Donor_new["updatedAt"]>;
  specimens: Array<
    Donor_new["specimens"][0] & {
      tumourNormalDesignation: TumourNormalDesignation;
    }
  >;
};

export const toJson = (
  doc: mongoose.Document & MongoDonorDocument
): MongoDonorDocument => doc.toJSON();

const DonorSchema = new mongoose.Schema<Donor>({}, { strict: false });
export default () =>
  mongoose.model<mongoose.Document & MongoDonorDocument>(
    MONGO_DONOR_MODEL_NAME,
    DonorSchema
  );
