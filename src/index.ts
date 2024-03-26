import { featureFlags, GRAPHQL_PORT, PORT, RDPC_URL } from "config";
import express from "express";
import * as kafka from "external/kafka";
import { queueProgramUpdateEvent } from "external/kafka/producers/programQueueProducer";
import logger from "logger";
import path from "path";
import { KnownEventType } from "processors/types";
import * as swaggerUi from "swagger-ui-express";
import yaml from "yamljs";
import applyStatusReport from "./statusReport";
import { startStandaloneServer } from "@apollo/server/standalone";
import { createApolloServer, gqlContext } from "gql/server";
import { getEsClient } from "external/elasticsearch";

(async () => {
  /**
   * Express app to host status reports and other interface for interacting with this app
   */
  const expressApp = express();
  const statusReporter = applyStatusReport(expressApp)("/status");
  expressApp.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(yaml.load(path.join(__dirname, "./assets/swagger.yaml")))
  );

  const esClient = await getEsClient();
  const apolloServer = await createApolloServer({ esClient });
  const { url } = await startStandaloneServer(apolloServer, {
    context: gqlContext,
    listen: { port: GRAPHQL_PORT },
  });
  logger.info(`GQL server ready at port: ${GRAPHQL_PORT}`);

  expressApp.post("/index/program/:program_id", async (req, res) => {
    const programId = req.params.program_id;
    try {
      logger.info(
        `received request to index program ${programId}, validating program id...`
      );
      // validate programId:
      const regex = new RegExp(
        "^[A-Z0-9][-_A-Z0-9]{2,7}[-](([A-Z][A-Z])|(INTL))$"
      );
      const found = programId.match(regex);

      if (!found) {
        return res
          .status(400)
          .send(
            `ProgramId (${programId}) is invalid, please enter a valid programId.`
          );
      } else {
        await queueProgramUpdateEvent({
          programId: programId,
          type: KnownEventType.SYNC,
          rdpcGatewayUrls: [RDPC_URL],
        });
        logger.info(`Program ${programId} has been queued for indexing.`);
        return res
          .status(200)
          .send(`Program ${programId} has been queued for indexing.`);
      }
    } catch (error) {
      logger.error("Error in processing index program request: " + error);
      return res
        .status(500)
        .send(`Failed to queue program ${programId} for indexing.`);
    }
  });

  // Initialize Kafka Consumers and Producers
  //  - Can be disabled to simplify running in dev, set FLAG_DEV_DISABLE_KAFKA=true in .env
  if (featureFlags.kafka) {
    await kafka.setup();
  }

  logger.info("pipeline is ready!");
  expressApp.listen(PORT, () => {
    logger.info(`Start readiness check at :${PORT}/status`);
  });
  statusReporter.setReady(true);
})();

// terminate kafka connections before exiting
// https://kafka.js.org/docs/producer-example
const errorTypes = ["unhandledRejection", "uncaughtException"];
const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];

errorTypes.map((type) => {
  process.on(type as any, async (e: Error) => {
    try {
      logger.info(`process.on ${type}`);
      logger.error(e.message);
      console.log(e); // Get full error output
      await kafka.disconnect();
      process.exit(0);
    } catch (_) {
      process.exit(1);
    }
  });
});

signalTraps.map((type) => {
  process.once(type as any, async () => {
    try {
      await kafka.disconnect();
    } finally {
      process.kill(process.pid, type);
    }
  });
});
