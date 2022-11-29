import { z } from "zod";

// Rollcall builds the index name as `entity_type_shardPrefix_shard_release_prefix_release`,
// release is not in the request because rollcall will calculate it
export type CreateResolvableIndexRequest = {
  entity: string;
  shard: string;
  shardPrefix: string;
  type: string;
  releasePrefix?: string;
  indexSetting?: string;
  cloneFromReleasedIndex?: boolean; // used to clone previously released index with similar parameters
};

export type IndexReleaseRequest = {
  alias: string;
  release: string;
  shards: string[];
};

export const ResolvedIndexSchema = z.object({
  indexName: z.string(),
  entity: z.string(),
  type: z.string(),
  shardPrefix: z.string(),
  shard: z.string(),
  releasePrefix: z.string(),
  release: z.string(),
  valid: z.boolean(),
});

export type ResolvedIndex = z.infer<typeof ResolvedIndexSchema>;

export type RollCallClient = {
  createNewResolvableIndex: (
    programShortName: string,
    cloneFromReleasedIndex?: boolean
  ) => Promise<ResolvedIndex>;
  release: (indexName: ResolvedIndex) => Promise<boolean>;
};
