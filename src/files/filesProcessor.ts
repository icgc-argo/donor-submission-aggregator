import { EgoJwtManager } from "auth";
import { getFilesByProgramId } from "files/getFilesByProgramId";
import _ from "lodash";
import logger from "logger";
import { initializeRdpcInfo } from "rdpc/analysesProcessor";
import { DonorInfoMap, StringMap } from "rdpc/types";
import {
  DonorMolecularDataReleaseStatus,
  File,
  FileReleaseState,
} from "./types";

export const getFilesByPage = async ({
  filesFetcher,
  egoJwtManager,
  programId,
  donorIds,
}: {
  programId: string;
  egoJwtManager: EgoJwtManager;
  donorIds?: string[];
  filesFetcher: typeof getFilesByProgramId;
}): Promise<StringMap<File[]>> => {
  const donorFiles: StringMap<File[]> = {};

  // todo query file service for file[] by donorIds, will be done under ticket 216
  if (donorIds) {
    for (const donorId of donorIds) {
      logger.info(`streaming analyses for donor ${donorId}`);
      const stream = fileStream(programId, egoJwtManager, filesFetcher);
      for await (const page of stream) {
        logger.info(
          `Streaming ${page.length} of files for donorId ${donorId}...`
        );
        const filesPerPage = groupFilesByDonorId(page);
        mergeAllPages(donorFiles, filesPerPage);
      }
    }
  } else {
    const stream = fileStream(programId, egoJwtManager, filesFetcher);
    for await (const page of stream) {
      logger.info(`Streaming ${page.length} files...`);
      const filesPerPage = groupFilesByDonorId(page);
      mergeAllPages(donorFiles, filesPerPage);
    }
  }
  return donorFiles;
};

export const determineReleaseStatus = async (
  programId: string,
  egoJwtManager: EgoJwtManager,
  filesFetcher: typeof getFilesByProgramId,
  donorIds?: string[]
): Promise<DonorInfoMap> => {
  const result: DonorInfoMap = {};
  // gets files grouped by donor id
  const files = await getFilesByPage({
    programId: programId,
    egoJwtManager: egoJwtManager,
    filesFetcher: filesFetcher,
    donorIds: donorIds,
  });

  Object.entries(files).forEach(([donorId, files]) => {
    const filesByReleaseState = _.groupBy(files, (file) => file.releaseState);
    console.log(`filesByReleaseState-- ${JSON.stringify(filesByReleaseState)}`);
    const releaseStates = Object.keys(filesByReleaseState);

    initializeRdpcInfo(result, donorId);

    switch (releaseStates.length) {
      case 1:
        // FULLY_RELEASED - all files for donor have release_state of PUBLIC
        if (releaseStates[0] === FileReleaseState.PUBLIC) {
          result[donorId].releaseStatus =
            DonorMolecularDataReleaseStatus.FULLY_RELEASED;
        }

        // NO_RELEASE - all files for donor have release_state of RESTRICTED or QUEUED
        if (
          releaseStates[0] === FileReleaseState.QUEUED ||
          releaseStates[0] === FileReleaseState.RESTRICTED
        ) {
          result[donorId].releaseStatus =
            DonorMolecularDataReleaseStatus.NO_RELEASE;
        }
        break;

      case 2:
        // If any file is in PUBLIC state, the donor file release state will be PARTIALLY_RELEASED.
        if (releaseStates.indexOf(FileReleaseState.PUBLIC) != -1) {
          result[donorId].releaseStatus =
            DonorMolecularDataReleaseStatus.PARTIALLY_RELEASED;
        } else {
          result[donorId].releaseStatus =
            DonorMolecularDataReleaseStatus.NO_RELEASE;
        }
        break;

      case 3:
        // PARTIALLY_RELEASED - a mix of PUBLIC and RESTRICTED or QUEUED amongst their files.
        result[donorId].releaseStatus ==
          DonorMolecularDataReleaseStatus.PARTIALLY_RELEASED;
        break;

      default:
        break;
    }
  });

  console.log(`result-- ${JSON.stringify(result)}`);
  return result;
};

const fileStream = async function* (
  programId: string,
  egoJwtManager: EgoJwtManager,
  filesFetcher: typeof getFilesByProgramId
): AsyncGenerator<File[]> {
  // Files-service get/files default first page is page 1
  let currentPage = 1;

  while (true) {
    const filesPerPage = await filesFetcher(
      egoJwtManager,
      programId,
      currentPage
    );

    // in case of api returns less files than chunk size, we need to stream from the last page
    // to make sure there is no data loss:
    currentPage++;

    if (filesPerPage.length > 0) {
      yield filesPerPage;
    } else {
      break;
    }
  }
};

const mergeAllPages = (
  donorFiles: StringMap<File[]>,
  toMerge: StringMap<File[]>
): StringMap<File[]> => {
  Object.entries(toMerge).forEach(([donorId, file]) => {
    const existingFiles = donorFiles[donorId] ? donorFiles[donorId] : [];
    donorFiles[donorId] = [...existingFiles, ...file];
  });
  return donorFiles;
};

const groupFilesByDonorId = (files: File[]): StringMap<File[]> => {
  const result = files.reduce<StringMap<File[]>>((fileAcc, file) => {
    if (!fileAcc[file.donorId]) {
      fileAcc[file.donorId] = [file];
    } else {
      fileAcc[file.donorId].push(file);
    }
    // console.log(`fileAcc ----- ${JSON.stringify(fileAcc)}`)
    return fileAcc;
  }, {});
  // console.log(`result ----- ${JSON.stringify(result)}`)
  return result;
};
