import fetch from "node-fetch";
import {
  IndexReleaseRequest,
  CreateResolvableIndexRequest,
  ResolvedIndex,
  RollCallClient,
} from "./types";
import urljoin from "url-join";
import logger from "logger";

export default (configData: {
  url: string;
  aliasName?: string;
  entity?: string;
  type?: string;
  shardPrefix?: string;
}): RollCallClient => {
  const rootUrl = configData.url;
  const aliasName = configData.aliasName || "donor_submission_summary";
  const indexEntity = configData?.entity || "donor";
  const indexType = configData?.type || "centric";
  const shardPrefix = configData?.shardPrefix || "pgm";

  const createNewResolvableIndex = async (
    programShortName: string,
    cloneFromReleasedIndex?: boolean
  ): Promise<ResolvedIndex> => {
    const url = urljoin(`${rootUrl}`, `/indices/create`);

    const req: CreateResolvableIndexRequest = {
      shardPrefix: shardPrefix,
      shard: await formatProgramShortName(programShortName),
      entity: indexEntity,
      type: indexType,
      cloneFromReleasedIndex: cloneFromReleasedIndex || false,
    };

    const newResolvedIndex = (await fetch(url, {
      method: "POST",
      body: JSON.stringify(req),
      headers: { "Content-Type": "application/json" },
    }).then((res) => res.json())) as ResolvedIndex;

    return newResolvedIndex;
  };

  const release = async (resovledIndex: ResolvedIndex): Promise<boolean> => {
    logger.info(
      `releasing index ${resovledIndex.indexName} to alias ${aliasName}`
    );
    const url = urljoin(`${rootUrl}`, `/aliases/release`);

    const req = await convertResolvedIndexToIndexReleaseRequest(resovledIndex);

    const acknowledged = (await fetch(url, {
      method: "POST",
      body: JSON.stringify(req),
      headers: { "Content-Type": "application/json" },
    }).then((res) => res.json())) as boolean;

    return acknowledged;
  };

  const convertResolvedIndexToIndexReleaseRequest = async (
    resovledIndex: ResolvedIndex
  ): Promise<IndexReleaseRequest> => {
    const alias = aliasName;
    const shard = resovledIndex.shardPrefix + "_" + resovledIndex.shard;
    const release = resovledIndex.releasePrefix + "_" + resovledIndex.release;

    return { alias, release, shards: [shard] };
  };

  const formatProgramShortName = async (programShortName: string) => {
    return programShortName.replace("-", "").trim().toLowerCase();
  };

  return {
    createNewResolvableIndex,
    release,
    aliasName,
  };
};
