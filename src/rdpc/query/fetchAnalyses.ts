import fetch from "node-fetch";
import { Analysis, AnalysisState, AnalysisType, WorkflowName } from "../types";
import logger from "logger";
import promiseRetry from "promise-retry";
import _ from "lodash";
import { EgoAccessToken, EgoJwtManager } from "auth";
import {
  MUTECT_REPO_URL,
  SANGER_VC_REPO_URL,
  SEQ_ALIGN_REPO_URL,
  OPEN_ACCESS_REPO_URL,
} from "config";
import { QueryVariable } from "./types";

const query = `
fragment AnalysisData on Analysis {
  analysisId
  analysisType
  donors {
    donorId
  }
}

query($analysisFilter: AnalysisFilter, $analysisPage: Page, $workflowRepoUrl: String) {
  analyses(
    filter: $analysisFilter,
    page: $analysisPage,
    sorts:{fieldName:analysisId, order: asc}
  ) {
    content {
      ...AnalysisData
      runs: inputForRuns(
        filter: {
          repository: $workflowRepoUrl
        }
      ) {
          runId
          state
          repository
          inputAnalyses {
              analysisId
              analysisType
          }
          producedAnalyses
            (filter: { analysisState: PUBLISHED }) {
              analysisId
              analysisState
              analysisType
            }
        }
    }

  }
}
`;

const fetchAnalyses = async ({
  studyId,
  rdpcUrl,
  analysisType,
  workflowName,
  from,
  size,
  egoJwtManager,
  donorId,
}: {
  studyId: string;
  rdpcUrl: string;
  analysisType: string;
  workflowName: WorkflowName;
  from: number;
  size: number;
  egoJwtManager: EgoJwtManager;
  donorId?: string;
}): Promise<Analysis[]> => {
  const jwt = (await egoJwtManager.getLatestJwt()) as EgoAccessToken;
  const accessToken = jwt.access_token;
  return await promiseRetry<Analysis[]>(async (retry) => {
    try {
      const workflowRepoUrl = getWorkflowRepoUrl(analysisType, workflowName);

      const response = await fetch(rdpcUrl, {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: {
            analysisFilter: {
              analysisState: AnalysisState.PUBLISHED,
              analysisType,
              studyId,
              donorId,
            },
            analysisPage: {
              from,
              size,
            },
            workflowRepoUrl,
          } as QueryVariable,
        }),
        headers: {
          "Content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
      });
      const jsonResponse = await response.json();
      const hasError = jsonResponse.errors?.length > 0;
      if (hasError) {
        const error = JSON.stringify(jsonResponse.errors);
        logger.error(
          `received error from rdpc... page: from => ${from} size => ${size}. Error: ${error}`
        );
        throw new Error(error);
      }
      return jsonResponse.data.analyses.content as Analysis[];
    } catch (err) {
      logger.warn(
        `Failed to fetch ${analysisType} analyses: ${err}, retrying...`
      );
      return retry(err);
    }
  }, retryConfig).catch((err) => {
    logger.error(
      `Failed to fetch analyses of program:
       ${studyId} from RDPC ${rdpcUrl} after ${retryConfig.retries} attempts: ${err}`
    );
    throw err;
  });
};

const getWorkflowRepoUrl = (
  analysisType: string,
  workflowName: WorkflowName
): string => {
  if (analysisType === AnalysisType.SEQ_EXPERIMENT) {
    logger.info(
      `Starting to query ${analysisType} analyses for alignment workflow runs`
    );
    return SEQ_ALIGN_REPO_URL;
  } else if (analysisType === AnalysisType.SEQ_ALIGNMENT) {
    switch (workflowName) {
      case WorkflowName.MUTECT:
        logger.info(
          `Starting to query ${analysisType} analyses for mutect2 workflow runs`
        );
        return MUTECT_REPO_URL;
      case WorkflowName.SANGER:
        logger.info(
          `Starting to query ${analysisType} analyses for sanger variant calling workflow runs`
        );
        return SANGER_VC_REPO_URL;
      default:
        logger.info(
          `Attempted to query '${analysisType}' analyses for '${workflowName}' workflow runs, no repo url found`
        );
        return "";
    }
  } else if (
    analysisType === AnalysisType.VARIANT_CALLING &&
    workflowName === WorkflowName.OPEN_ACCESS
  ) {
    logger.info(
      `Starting to query ${analysisType} analyses for open access workflow runs`
    );
    return OPEN_ACCESS_REPO_URL;
  } else {
    logger.info(
      `Attempted to query '${analysisType}' analyses for '${workflowName}' workflow runs, no repo url found`
    );
    return "";
  }
};

const retryConfig = {
  factor: 2,
  retries: 3,
  minTimeout: 3000,
  maxTimeout: Infinity,
};

export default fetchAnalyses;
