import fetch from 'node-fetch';
import { IndexReleaseRequest, CreateResolvableIndexRequest, ResolvedIndex, RollcallClient } from './types';

export default (
  configData: {url: string, entity?: string, type?: string, shardPrefix?: string}
  ): RollcallClient => {
  const rootUrl = configData.url;
  const indexEntity = configData?.entity || "donor";
  const indexType = configData?.type || "centric";
  const shardPrefix = configData?.shardPrefix || "pgm";

  const createNewResolvableIndex = async (programShortName: string, cloneFromReleasedIndex?: boolean): Promise<ResolvedIndex> => {
    const url = `${rootUrl}/indices/create`;

    // shardPrefix, entity, and type could be config variables
    const req: CreateResolvableIndexRequest = {
      shardPrefix: shardPrefix,
      shard: await formatProgramShortName(programShortName),
      entity: indexEntity,
      type: indexType,
      cloneFromReleasedIndex: cloneFromReleasedIndex || false
  }

    const newResolvedIndex = await fetch(url, { 
      method: 'POST',
      body: JSON.stringify(req), 
      headers: {  "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .catch(err => { throw new Error(err) }) as ResolvedIndex;

    return newResolvedIndex;
  };

  const release = async (indexName: string): Promise<boolean> =>  { 
    const url = `${rootUrl}/aliases/release`

    // shardPrefix, entity, and type could be config variables
    const req = await convertIndexNameToIndexReleaseRequest(indexName);

    const acknowledged = await fetch(url, 
      {
        method: 'POST',
        body: JSON.stringify(req), 
        headers: {  "Content-Type": "application/json" }
      }
    ).then(res => res.json())
    .catch(err => { throw new Error(err) })  as boolean;

    return Boolean(acknowledged);
 };

 const convertIndexNameToIndexReleaseRequest = async (indexName: string): Promise<IndexReleaseRequest> => {
   const indexNameParts = indexName.split('_');
   const alias = indexNameParts[0] + "_" + indexNameParts[1];
   const shard = indexNameParts[2] + "_" + indexNameParts[3];
   const release = indexNameParts[4] + "_" + indexNameParts[5];

   return { alias, release, shards: [shard] };
 }

 const formatProgramShortName = async (programShortName: string) => {
   return programShortName.replace("-", "").trim().toLowerCase();
 }

 return {
  createNewResolvableIndex,
  release
 }
}