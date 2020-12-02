import {
  ROLLCALL_INDEX_ENTITY,
  ROLLCALL_INDEX_SHARDPREFIX,
  ROLLCALL_INDEX_TYPE,
} from "config";

export const generateIndexName = (programId: string): string => {
  const programName = programId.replace("-", "").toLocaleLowerCase();
  return `${ROLLCALL_INDEX_ENTITY}_${ROLLCALL_INDEX_TYPE}_${ROLLCALL_INDEX_SHARDPREFIX}_${programName}_`;
};
