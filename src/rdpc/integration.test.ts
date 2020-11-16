import { Client } from "@elastic/elasticsearch";
import { expect } from "chai";
import esb from "elastic-builder";
import { initIndexMapping } from "elasticsearch";
import { EsHit } from "indexClinicalData/types";
import { Duration, TemporalUnit } from "node-duration";
import { indexRdpcData } from "rdpc";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import fetchAnalyses from "rdpc/fetchAnalyses";
import {
  clinicalDataset,
  expectedRDPCData,
} from "./fixtures/integrationTest/dataset";
import {
  mockSeqAlignmentAnalyses,
  mockSeqExpAnalyses,
} from "./fixtures/integrationTest/mockAnalyses";
import { Analysis, AnalysisType } from "./types";

describe("should index RDPC analyses to donor index", () => {
  let elasticsearchContainer: StartedTestContainer;
  let esClient: Client;
  const ES_PORT = 10092;
  const TEST_PROGRAM = "TEST-CA";
  const INDEX_NAME = "test";
  const NETOWRK_MODE = "host";
  const url = "https://api.rdpc-qa.cancercollaboratory.org/graphql";

  before(async () => {
    try {
      elasticsearchContainer = await new GenericContainer(
        "elasticsearch",
        "7.5.0"
      )
        .withNetworkMode(NETOWRK_MODE)
        .withExposedPorts(ES_PORT)
        .withEnv("discovery.type", "single-node")
        .withEnv("http.port", `${ES_PORT}`)
        .withHealthCheck({
          test: `curl -f http://localhost:${ES_PORT} || exit 1`, // this is executed inside the container
          startPeriod: new Duration(2, TemporalUnit.SECONDS),
          retries: 2,
          interval: new Duration(1, TemporalUnit.SECONDS),
          timeout: new Duration(5, TemporalUnit.SECONDS),
        })
        .withWaitStrategy(Wait.forHealthCheck())
        .start();

      const ES_MAPPED_HOST = `http://${elasticsearchContainer.getContainerIpAddress()}`;
      const ES_HOST = `${ES_MAPPED_HOST}:${ES_PORT}`;

      esClient = new Client({ node: ES_HOST });
    } catch (err) {
      console.log("brfore >>>>>>>>>>>>", err);
    }
  });

  beforeEach(async () => {
    console.log("beforeEach >>>>>>>>>>>", `creating index ${INDEX_NAME}...`);
    await esClient.indices.create({
      index: INDEX_NAME,
    });
    await initIndexMapping(INDEX_NAME, esClient);
    console.log(
      "beforeEach >>>>>>>>>>> Initializing index mapping is complete"
    );
  });

  after(async () => {
    await elasticsearchContainer.stop();
  });

  afterEach(async () => {
    await esClient.indices.delete({
      index: INDEX_NAME,
    });
  });

  it("should index sequencing experiment and sequencing alignment analyses", async () => {
    const { body: exists } = await esClient.indices.exists({
      index: INDEX_NAME,
    });
    expect(exists).to.be.true;

    // index testing clinical data
    const body = clinicalDataset.flatMap((doc) => [
      { index: { _index: INDEX_NAME } },
      doc,
    ]);

    console.log("Indexing clinical data....");

    const { body: bulkResponse } = await esClient.bulk({
      body,
      refresh: "wait_for",
    });

    const indexedClinicalDocuments = (
      await esClient.search({
        index: INDEX_NAME,
        track_total_hits: true,
      })
    ).body?.hits?.total;

    console.log(
      "Total numer of indexed clinical documents: ",
      indexedClinicalDocuments.value
    );

    expect(indexedClinicalDocuments.value).to.equal(clinicalDataset.length);

    const mockAnalysisFetcher: typeof fetchAnalyses = async (
      studyId: string,
      rdpcUrl: string,
      workflowRepoUrl: string,
      analysisType: string,
      from: number,
      size: number
    ): Promise<Analysis[]> => {
      return Promise.resolve(
        analysisType === AnalysisType.SEQ_EXPERIMENT
          ? mockSeqExpAnalyses.slice(from, from + size)
          : mockSeqAlignmentAnalyses.slice(from, from + size)
      );
    };

    console.log("Begin indexing RDPC analyses....");
    await indexRdpcData(
      TEST_PROGRAM,
      url,
      INDEX_NAME,
      esClient,
      mockAnalysisFetcher
    );

    const totalEsDocumentsCount = (
      await esClient.search({
        index: INDEX_NAME,
        track_total_hits: true,
      })
    ).body?.hits?.total?.value;
    console.log("Total donors indexed: ", totalEsDocumentsCount);
    expect(totalEsDocumentsCount).to.equal(mockSeqExpAnalyses.length);

    // Verify if es documents have correct RDPC info:
    const donorIds = clinicalDataset.map((doc) => {
      return doc.donorId;
    });

    donorIds.forEach(async (donorId) => {
      const esQuery = esb
        .requestBodySearch()
        .size(donorIds.length)
        .query(esb.termQuery("donorId", donorId));

      const esHits: EsHit[] = await esClient
        .search({
          index: INDEX_NAME,
          body: esQuery,
        })
        .then((res) => res.body.hits.hits)
        .catch((err) => {
          return [];
        });

      expect(esHits.length).to.equal(1);
      expect(esHits[0]._source.alignmentsCompleted).to.equal(
        expectedRDPCData[donorId].alignmentsCompleted
      );
      expect(esHits[0]._source.alignmentsFailed).to.equal(
        expectedRDPCData[donorId].alignmentsFailed
      );
      expect(esHits[0]._source.alignmentsRunning).to.equal(
        expectedRDPCData[donorId].alignmentsRunning
      );
      expect(esHits[0]._source.sangerVcsCompleted).to.equal(
        expectedRDPCData[donorId].sangerVcsCompleted
      );
      expect(esHits[0]._source.sangerVcsFailed).to.equal(
        expectedRDPCData[donorId].sangerVcsFailed
      );
      expect(esHits[0]._source.sangerVcsRunning).to.equal(
        expectedRDPCData[donorId].sangerVcsRunning
      );
    });
  });
});
