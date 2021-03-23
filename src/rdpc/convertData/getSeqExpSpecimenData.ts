import { EgoJwtManager } from "auth";
import { FirstPublishedDateFields } from "indexClinicalData/types";
import { countSpecimenType, mergeDonorInfo } from "../analysesProcessor";
import {
  getAllMergedDonorWithSpecimens,
  getFirstPublishedDate,
} from "../analysesSpecimenProcessor";
import fetchAnalysesWithSpecimens from "../fetchAnalysesWithSpecimens";
import {
  findEarliestAvailableSamplePair,
  findMatchedTNPairs,
} from "../findMatchedTNPairs";
import { DonorInfoMap } from "../types";
import { StreamState } from "./type";

export const getSeqExpSpecimenData = async (
  studyId: string,
  url: string,
  analysisType: string,
  egoJwtManager: EgoJwtManager,
  analysesFetcher: typeof fetchAnalysesWithSpecimens,
  config: {
    chunkSize: number;
    state?: StreamState;
  },
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const mergedDonors = await getAllMergedDonorWithSpecimens({
    studyId: studyId,
    url: url,
    donorIds: donorIds,
    analysisType: analysisType,
    egoJwtManager,
    config,
    analysesFetcher,
  });

  // gets tumour/normal counts into rdpcInfo:
  const rdpcInfo_TNcounts = countSpecimenType(mergedDonors);

  // get raw reads first published date into rdpcInfo:
  const donorsWithMatchedSamplePairs_seqExp = findMatchedTNPairs(mergedDonors);
  const donorsWithEarliestPair_seqExp = findEarliestAvailableSamplePair(
    donorsWithMatchedSamplePairs_seqExp
  );

  const rdpcInfo_rawReadsDate = getFirstPublishedDate(
    donorsWithEarliestPair_seqExp,
    FirstPublishedDateFields.RAW_READS_FIRST_PUBLISHED_DATE
  );

  // merge 2 rdpcInfoMap:
  const result = mergeDonorInfo(rdpcInfo_TNcounts, rdpcInfo_rawReadsDate);
  return result;
};
