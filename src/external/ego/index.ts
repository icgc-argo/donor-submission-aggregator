import { EGO_URL } from 'config';
import { createAuthClient, getEgoAppCredentials } from 'external/ego/utils';
import logger from 'logger';

export const getEgoToken = async (): Promise<string> => {
	logger.debug(`Creating Ego client`);
	const egoCredentials = await getEgoAppCredentials();
	const client = await createAuthClient(EGO_URL, egoCredentials);

	if (client) {
		return client.getAuth();
	} else {
		throw new Error(`Unable to establish Ego Client`);
	}
};
