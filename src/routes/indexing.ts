import { RDPC_URL } from 'config';
import express from 'express';
import { queueProgramUpdateEvent } from 'external/kafka/producers/programQueueProducer';
import logger from 'logger';
import { KnownEventType } from 'processors/types';

const router = express.Router({ mergeParams: true });

router.post('/program/:program_id', async (req, res) => {
	const programId = req.params.program_id;
	try {
		logger.info(`received request to index program ${programId}, validating program id...`);
		// validate programId:
		const regex = new RegExp('^[A-Z0-9][-_A-Z0-9]{2,7}[-](([A-Z][A-Z])|(INTL))$');
		const found = programId.match(regex);

		if (!found) {
			return res
				.status(400)
				.send(`ProgramId (${programId}) is invalid, please enter a valid programId.`);
		} else {
			await queueProgramUpdateEvent({
				programId: programId,
				type: KnownEventType.SYNC,
				rdpcGatewayUrls: [RDPC_URL],
			});
			logger.info(`Program ${programId} has been queued for indexing.`);
			return res.status(200).send(`Program ${programId} has been queued for indexing.`);
		}
	} catch (error) {
		logger.error('Error in processing index program request: ' + error);
		return res.status(500).send(`Failed to queue program ${programId} for indexing.`);
	}
});

export default router;
