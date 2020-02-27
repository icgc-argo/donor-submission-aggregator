import fetch from 'node-fetch';
import { IndexReleaseRequest, CreateResolvableIndexRequest, ResolvedIndex } from './types';
export class RollcallClient {
  rootUrl: string;
  indexEntity: string;;
  indexType: string;
  shardPrefix: string;

  constructor(configData: {url: string, entity?: string, type?: string, shardPrefix?: string}) {
    this.rootUrl = configData.url;
    this.indexEntity = configData?.entity || "donor";
    this.indexType = configData?.type || "centric";
    this.shardPrefix = configData?.shardPrefix || "pgm";
  }

  createNewResolvableIndex = async (programShortName: string): Promise<ResolvedIndex> => {
    const url = `${this.rootUrl}/indices/create`;

    // shardPrefix, entity, and type could be config variables
    const req: CreateResolvableIndexRequest = {
      shardPrefix: this.shardPrefix,
      shard: this.formatProgramShortName(programShortName),
      entity: this.indexEntity,
      type: this.indexType
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

  release = async (indexName: string): Promise<boolean> =>  { 
    const url = `${this.rootUrl}/aliases/release`

    // shardPrefix, entity, and type could be config variables
    const req = await this.convertIndexNameToIndexReleaseRequest(indexName);

    const acknoledged = await fetch(url, 
      {
        method: 'POST',
        body: JSON.stringify(req), 
        headers: {  "Content-Type": "application/json" }
      }
    ).then(res => res.json())
    .catch(err => { throw new Error(err) })  as boolean;

    return Boolean(acknoledged);
 };

 private convertIndexNameToIndexReleaseRequest = async (indexName: string): Promise<IndexReleaseRequest> => {
   const indexNameParts = indexName.split('_');
   const alias = indexNameParts[0] + "_" + indexNameParts[1];
   const shard = indexNameParts[2] + "_" + indexNameParts[3];
   const release = indexNameParts[4] + "_" + indexNameParts[5];

   return { alias, release, shards: [shard] };
 }

 private formatProgramShortName(programShortName: string) {
   return programShortName.replace("-", "").trim().toLowerCase();
 }
}