import { EgoJwtManager } from "auth";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import {
  convertEarliestDateToDonorInfo,
  getAllMergedDonor_variantCalling,
  getEarliestDateForDonor,
} from "rdpc/variantCallingAnalysesProcessor";
import { AnalysisType, DonorInfoMap } from "../types";
import { StreamState } from "./type";

export const getVariantCallingData = async (
  studyId: string,
  url: string,
  egoJwtManager: EgoJwtManager,
  analysesFetcher: typeof fetchAnalysesWithSpecimens,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  donorIds?: string[],
  analysisType?: AnalysisType
): Promise<DonorInfoMap> => {
  const mergedDonors = await getAllMergedDonor_variantCalling({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    egoJwtManager,
    config,
    analysesFetcher,
    analysisType,
  });

  const donorsWithEarliestDate = getEarliestDateForDonor(mergedDonors);

  const sangerMutectDates = convertEarliestDateToDonorInfo(
    donorsWithEarliestDate
  );

  return sangerMutectDates;
};
