import { EGO_URL_DCC, EGO_URL_RDPC } from 'config';
import { AuthClient, createAuthClient, getEgoAppCredentials } from 'external/ego/utils';
import logger from 'logger';

/**
 * Keep instance of auth clients for fetching RDPC and DCC credentials
 */
let clients: { rdpc?: AuthClient; dcc?: AuthClient } = {};

const egoHosts = { dcc: EGO_URL_DCC, rdpc: EGO_URL_RDPC };

export const getEgoToken = async (cluster: 'dcc' | 'rdpc'): Promise<string> => {
	if (!clients[cluster]) {
		logger.debug(`Creating Ego client for ${cluster}`);
		const egoCredentials = await getEgoAppCredentials(cluster);
		clients[cluster] = await createAuthClient(egoHosts[cluster], egoCredentials);
	}

	if (clients[cluster]) {
		return (clients[cluster] as AuthClient).getAuth();
	} else {
		throw new Error(`Unable to establish Ego Client for ${cluster}`);
	}
};
