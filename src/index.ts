import { startStandaloneServer } from '@apollo/server/standalone';
import { featureFlags, GRAPHQL_PORT, PORT } from 'config';
import express from 'express';
import { getEsClient } from 'external/elasticsearch';
import * as kafka from 'external/kafka';
import { createApolloServer, gqlContext } from 'gql/server';
import logger from 'logger';
import path from 'path';
import indexingRouter from 'routes/indexing';
import * as swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import applyStatusReport from './statusReport';

(async () => {
	/**
	 * Express app to host status reports and other interface for interacting with this app
	 */
	const expressApp = express();
	const statusReporter = applyStatusReport(expressApp)('/status');
	expressApp.use(
		'/api-docs',
		swaggerUi.serve,
		swaggerUi.setup(yaml.load(path.join(__dirname, './assets/swagger.yaml'))),
	);

	const esClient = await getEsClient();
	const apolloServer = await createApolloServer({ esClient });
	const { url } = await startStandaloneServer(apolloServer, {
		context: gqlContext,
		listen: { port: GRAPHQL_PORT },
	});
	logger.info(`GQL server ready at port: ${GRAPHQL_PORT}`);

	if (featureFlags.endpoint.index) {
		expressApp.use('/index', indexingRouter);
	}

	// Initialize Kafka Consumers and Producers
	//  - Can be disabled to simplify running in dev, set FLAG_DEV_DISABLE_KAFKA=true in .env
	if (featureFlags.kafka) {
		await kafka.setup();
	}

	logger.info('pipeline is ready!');
	expressApp.listen(PORT, () => {
		logger.info(`Start readiness check at :${PORT}/status`);
	});
	statusReporter.setReady(true);
})();

// terminate kafka connections before exiting
// https://kafka.js.org/docs/producer-example
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

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
