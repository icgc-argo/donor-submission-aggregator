import { FirstPublishedDateFields } from "indexClinicalData/types";
import fetchAnalysesWithSpecimens from "rdpc/query/fetchAnalysesWithSpecimens";
import { countSpecimenType, mergeDonorInfo } from "../analysesProcessor";
import {
  getAllMergedDonorWithSpecimens,
  getFirstPublishedDate,
} from "../analysesSpecimenProcessor";
import {
  countMatchedSamplePairs,
  findEarliestAvailableSamplePair,
  findMatchedTNPairs,
  getRnaSampleFirstPublishedDate,
} from "../findMatchedTNPairs";
import { DonorInfoMap } from "../types";
import { StreamState } from "./type";

export const getSeqExpSpecimenData = async (
  studyId: string,
  url: string,
  analysisType: string,
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
    config,
    analysesFetcher,
  });

  // records the number of DNA and RNA tumour/normal raw reads:
  const rdpcInfo_TNcounts = countSpecimenType(mergedDonors);

  const matchedSamplePairsByDonorId_seqExp = findMatchedTNPairs(mergedDonors);

  const rdpcInfo_rnaRawReadsFirstPublishedDate = getRnaSampleFirstPublishedDate(
    mergedDonors,
    FirstPublishedDateFields.RNA_RAW_READS_FIRST_PUBLISHED_DATE
  );

  // records the number of DNA matched sample pairs:
  const rdpcInfo_samplePairsCount = countMatchedSamplePairs(
    matchedSamplePairsByDonorId_seqExp
  );

  // records the raw reads first published date:
  const earliestPairByDonorId_seqExp = findEarliestAvailableSamplePair(
    matchedSamplePairsByDonorId_seqExp
  );

  const rdpcInfo_rawReadsDate = getFirstPublishedDate(
    earliestPairByDonorId_seqExp,
    FirstPublishedDateFields.RAW_READS_FIRST_PUBLISHED_DATE
  );

  const rdpcInfo_dnaRawReads = mergeDonorInfo(
    rdpcInfo_TNcounts,
    rdpcInfo_rawReadsDate
  );
  const rdpcInfo_dna = mergeDonorInfo(
    rdpcInfo_dnaRawReads,
    rdpcInfo_samplePairsCount
  );
  const result = mergeDonorInfo(
    rdpcInfo_dna,
    rdpcInfo_rnaRawReadsFirstPublishedDate
  );
  return result;
};
