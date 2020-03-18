// Rollcall builds the index name as `entity_type_shardPrefix_shard_release_prefix_release`,
// release is not in the request because rollcall will calculate it
export type CreateResolvableIndexRequest = {
  entity: string;
  shard: string;
  shardPrefix: string;
  type: string;
  releasePrefix?: string;
  indexSettings?: string;
  cloneFromReleasedIndex?: boolean; // used to clone previously released index with similar parameters
};

export type IndexReleaseRequest = {
  alias: string;
  release: string;
  shards: string[];
};

export type ResolvedIndex = {
  indexName: string;
  entity: string;
  type: string;
  shardPrefix: string;
  shard: string;
  releasePrefix: string;
  release: string;
  valid: boolean;
};

export type RollcallClient = {
  createNewResolvableIndex: (
    programShortName: string,
    cloneFromReleasedIndex?: boolean
  ) => Promise<ResolvedIndex>;
  release: (indexName: ResolvedIndex) => Promise<boolean>;
};
