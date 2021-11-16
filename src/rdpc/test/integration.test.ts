import { Client } from "@elastic/elasticsearch";
import { expect } from "chai";
import esb from "elastic-builder";
import { initIndexMapping } from "elasticsearch";
import { EsHit } from "indexClinicalData/types";
import { Duration, TemporalUnit } from "node-duration";
import { indexRdpcData } from "rdpc";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import fetchAnalyses from "rdpc/query/fetchAnalyses";
import {
  clinicalDataset,
  expectedRDPCData,
} from "./fixtures/integrationTest/dataset";
import {
  seqAlignmentAnalyses_mutect,
  seqAlignmentAnalyses_sanger,
  seqExpAnalyses,
  seqExpAnalysesWithSpecimens,
  variantCallingAnalyses,
  variantCallingAnalyses_open,
} from "./fixtures/integrationTest/mockAnalyses";
import { Analysis, AnalysisType } from "../types";
import { EgoAccessToken, EgoJwtManager } from "auth";
import fetchAnalysesWithSpecimens from "../query/fetchAnalysesWithSpecimens";
import fetchVariantCallingAnalyses from "rdpc/query/fetchVariantCallingAnalyses";
import { WORKFLOW_NAMES } from "config";

describe("should index RDPC analyses to donor index", () => {
  let elasticsearchContainer: StartedTestContainer;
  let esClient: Client;
  const ES_PORT = 10092;
  const TEST_PROGRAM = "TEST-CA";
  const INDEX_NAME = "test";
  const NETOWRK_MODE = "host";
  const url = "https://api.rdpc-qa.cancercollaboratory.org/graphql";
  const donorIds = clinicalDataset.map((doc) => doc.donorId);

  const mockEgoJwtManager: EgoJwtManager = {
    getLatestJwt: async (): Promise<EgoAccessToken> => {
      return {
        access_token: "dummy",
        token_type: "",
        expires_in: 99999,
        scope: "",
        groups: "",
      };
    },
  };

  const mockAnalysisFetcher: typeof fetchAnalyses = async ({
    studyId,
    rdpcUrl,
    analysisType,
    workflowName,
    from,
    size,
    egoJwtManager,
    donorId,
  }): Promise<Analysis[]> => {
    const matchesDonorId = (donor: any) =>
      donorId ? donor.donorId === donorId : true;
    return Promise.resolve(
      analysisType === AnalysisType.SEQ_EXPERIMENT
        ? seqExpAnalyses
            .filter((analysis) => analysis.donors.some(matchesDonorId))
            .slice(from, from + size)
        : workflowName === WORKFLOW_NAMES.MUTECT
        ? seqAlignmentAnalyses_mutect
            .filter((analysis) => analysis.donors.some(matchesDonorId))
            .slice(from, from + size)
        : workflowName === WORKFLOW_NAMES.SANGER
        ? seqAlignmentAnalyses_sanger
            .filter((analysis) => analysis.donors.some(matchesDonorId))
            .slice(from, from + size)
        : variantCallingAnalyses_open
            .filter((analysis) => analysis.donors.some(matchesDonorId))
            .slice(from, from + size)
    );
  };

  const mockAnalysesWithSpecimensFetcher: typeof fetchAnalysesWithSpecimens = async ({
    studyId,
    rdpcUrl,
    from,
    size,
    egoJwtManager,
    donorId,
  }): Promise<Analysis[]> => {
    const matchesDonorId = (donor: any) =>
      donorId ? donor.donorId === donorId : true;
    return Promise.resolve(
      seqExpAnalysesWithSpecimens
        .filter((analysis) => analysis.donors.some(matchesDonorId))
        .slice(from, from + size)
    );
  };

  const mockVariantCallingFetcher: typeof fetchVariantCallingAnalyses = ({
    studyId,
    rdpcUrl,
    from,
    size,
    egoJwtManager,
    donorId,
  }): Promise<Analysis[]> => {
    const matchesDonorId = (donor: any) =>
      donorId ? donor.donorId === donorId : true;
    return Promise.resolve(
      variantCallingAnalyses
        .filter((analysis) => analysis.donors.some(matchesDonorId))
        .slice(from, from + size)
    );
  };

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

    await esClient.bulk({
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

    console.log("Begin indexing RDPC analyses....");
    await indexRdpcData({
      programId: TEST_PROGRAM,
      rdpcUrl: url,
      targetIndexName: INDEX_NAME,
      esClient,
      egoJwtManager: mockEgoJwtManager,
      analysesFetcher: mockAnalysisFetcher,
      analysesWithSpecimensFetcher: mockAnalysesWithSpecimensFetcher,
      fetchVC: mockVariantCallingFetcher,
    });

    const totalEsDocumentsCount = (
      await esClient.search({
        index: INDEX_NAME,
        track_total_hits: true,
      })
    ).body?.hits?.total?.value;
    console.log("Total donors indexed: ", totalEsDocumentsCount);
    expect(totalEsDocumentsCount).to.equal(seqExpAnalyses.length);

    // Verify if es documents have correct RDPC info:
    const esHits = await Promise.all(
      donorIds.map(async (donorId) => {
        const esQuery = esb
          .requestBodySearch()
          .size(donorIds.length)
          .query(esb.termQuery("donorId", donorId));

        const esHits: EsHit = await esClient
          .search({
            index: INDEX_NAME,
            body: esQuery,
          })
          .then((res) => res.body.hits.hits[0])
          .catch((err) => {
            return null;
          });
        return esHits;
      })
    );

    for (const hit of esHits) {
      expect(hit._source.alignmentsCompleted).to.equal(
        expectedRDPCData[hit._source.donorId].alignmentsCompleted
      );
      expect(hit._source.alignmentsFailed).to.equal(
        expectedRDPCData[hit._source.donorId].alignmentsFailed
      );
      expect(hit._source.alignmentsRunning).to.equal(
        expectedRDPCData[hit._source.donorId].alignmentsRunning
      );
      expect(hit._source.sangerVcsCompleted).to.equal(
        expectedRDPCData[hit._source.donorId].sangerVcsCompleted
      );
      expect(hit._source.sangerVcsFailed).to.equal(
        expectedRDPCData[hit._source.donorId].sangerVcsFailed
      );
      expect(hit._source.sangerVcsRunning).to.equal(
        expectedRDPCData[hit._source.donorId].sangerVcsRunning
      );
      expect(hit._source.mutectCompleted).to.equal(
        expectedRDPCData[hit._source.donorId].mutectCompleted
      );
      expect(hit._source.mutectRunning).to.equal(
        expectedRDPCData[hit._source.donorId].mutectRunning
      );
      expect(hit._source.mutectFailed).to.equal(
        expectedRDPCData[hit._source.donorId].mutectFailed
      );
      expect(hit._source.openAccessCompleted).to.equal(
        expectedRDPCData[hit._source.donorId].openAccessCompleted
      );
      expect(hit._source.openAccessRunning).to.equal(
        expectedRDPCData[hit._source.donorId].openAccessRunning
      );
      expect(hit._source.openAccessFailed).to.equal(
        expectedRDPCData[hit._source.donorId].openAccessFailed
      );
      expect(hit._source.sangerVcsFirstPublishedDate).to.equal(
        expectedRDPCData[hit._source.donorId].sangerVcsFirstPublishedDate
      );
      expect(hit._source.mutectFirstPublishedDate).to.equal(
        expectedRDPCData[hit._source.donorId].mutectFirstPublishedDate
      );
      expect(hit._source.openAccessFirstPublishedDate).to.equal(
        expectedRDPCData[hit._source.donorId].openAccessFirstPublishedDate
      );
    }
  });

  it("should handle incremental rdpc indexing with studyId", async () => {
    // index testing clinical data
    const body = clinicalDataset.flatMap((doc) => [
      { index: { _index: INDEX_NAME } },
      doc,
    ]);

    await esClient.bulk({
      body,
      refresh: "wait_for",
    });

    const testAnalysis = seqAlignmentAnalyses_sanger[0];

    const testDonorId = testAnalysis.donors[0].donorId;

    await indexRdpcData({
      programId: TEST_PROGRAM,
      rdpcUrl: url,
      targetIndexName: INDEX_NAME,
      esClient,
      egoJwtManager: mockEgoJwtManager,
      analysisId: testAnalysis.analysisId,
      analysesFetcher: mockAnalysisFetcher,
      analysesWithSpecimensFetcher: mockAnalysesWithSpecimensFetcher,
      fetchVC: mockVariantCallingFetcher,
      fetchDonorIds: ({ analysisId, rdpcUrl }) =>
        Promise.resolve([testDonorId]),
    });

    const esHits = await Promise.all(
      donorIds.map(async (donorId) => {
        const esQuery = esb
          .requestBodySearch()
          .size(donorIds.length)
          .query(esb.termQuery("donorId", donorId));

        const esHits: EsHit = await esClient
          .search({
            index: INDEX_NAME,
            body: esQuery,
          })
          .then((res) => res.body.hits.hits[0])
          .catch((err) => {
            return null;
          });
        return esHits;
      })
    );

    esHits.forEach((hit) => {
      expect([
        hit._source.donorId,
        "alignmentsCompleted",
        hit._source.alignmentsCompleted,
      ]).to.deep.equal([
        hit._source.donorId,
        "alignmentsCompleted",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].alignmentsCompleted
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "alignmentsFailed",
        hit._source.alignmentsFailed,
      ]).to.deep.equal([
        hit._source.donorId,
        "alignmentsFailed",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].alignmentsFailed
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "alignmentsRunning",
        hit._source.alignmentsRunning,
      ]).to.deep.equal([
        hit._source.donorId,
        "alignmentsRunning",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].alignmentsRunning
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "sangerVcsCompleted",
        hit._source.sangerVcsCompleted,
      ]).to.deep.equal([
        hit._source.donorId,
        "sangerVcsCompleted",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].sangerVcsCompleted
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "sangerVcsFailed",
        hit._source.sangerVcsFailed,
      ]).to.deep.equal([
        hit._source.donorId,
        "sangerVcsFailed",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].sangerVcsFailed
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "sangerVcsRunning",
        hit._source.sangerVcsRunning,
      ]).to.deep.equal([
        hit._source.donorId,
        "sangerVcsRunning",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].sangerVcsRunning
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "mutectCompleted",
        hit._source.mutectCompleted,
      ]).to.deep.equal([
        hit._source.donorId,
        "mutectCompleted",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].mutectCompleted
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "mutectRunning",
        hit._source.mutectRunning,
      ]).to.deep.equal([
        hit._source.donorId,
        "mutectRunning",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].mutectRunning
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "mutectFailed",
        hit._source.mutectFailed,
      ]).to.deep.equal([
        hit._source.donorId,
        "mutectFailed",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].mutectFailed
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "openAccessCompleted",
        hit._source.openAccessCompleted,
      ]).to.deep.equal([
        hit._source.donorId,
        "openAccessCompleted",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].openAccessCompleted
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "openAccessRunning",
        hit._source.openAccessRunning,
      ]).to.deep.equal([
        hit._source.donorId,
        "openAccessRunning",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].openAccessRunning
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "openAccessFailed",
        hit._source.openAccessFailed,
      ]).to.deep.equal([
        hit._source.donorId,
        "openAccessFailed",
        hit._source.donorId === testDonorId
          ? expectedRDPCData[hit._source.donorId].openAccessFailed
          : 0,
      ]);
      expect([
        hit._source.donorId,
        "sangerVcsFirstPublishedDate",
        hit._source.sangerVcsFirstPublishedDate,
      ]).to.deep.equal([
        hit._source.donorId,
        "sangerVcsFirstPublishedDate",
        expectedRDPCData[hit._source.donorId].sangerVcsFirstPublishedDate,
      ]);
      expect([
        hit._source.donorId,
        "mutectFirstPublishedDate",
        hit._source.mutectFirstPublishedDate,
      ]).to.deep.equal([
        hit._source.donorId,
        "mutectFirstPublishedDate",
        expectedRDPCData[hit._source.donorId].mutectFirstPublishedDate,
      ]);
      expect([
        hit._source.donorId,
        "openAccessFirstPublishedDate",
        hit._source.openAccessFirstPublishedDate,
      ]).to.deep.equal([
        hit._source.donorId,
        "openAccessFirstPublishedDate",
        expectedRDPCData[hit._source.donorId].openAccessFirstPublishedDate,
      ]);
    });
  });
});
