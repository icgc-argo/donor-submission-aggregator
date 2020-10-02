import { MongoDonorDocument } from "./clinicalMongo/donorModel/index";
export const esDonorId = (donor: MongoDonorDocument) => `DO${donor.donorId}`;
