import { esClient } from "elasticsearch";

const ALIAS = "donors";

const getNewIndexName = async (programShortName: string) => {
  const indexName = `programs-${programShortName}-${Math.random()}`;
  await esClient.indices.create({
    index: indexName
  });
  return indexName;
};

const release = async (index: string) => {};

export default {
  getNewIndexName: getNewIndexName,
  release: release
};
