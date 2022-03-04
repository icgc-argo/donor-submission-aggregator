import {
  AuthClient,
  createAuthClient,
  getEgoAppCredentials,
} from "external/ego/utils";

/**
 * Keep single instance of auth client for fetching RDPC and DCC credentials
 */
let clients: { rdpc: AuthClient; dcc: AuthClient };

export const getEgoToken = async (cluster: "dcc" | "rdpc"): Promise<string> => {
  if (!clients[cluster]) {
    const egoCredentials = await getEgoAppCredentials(cluster);
    clients[cluster] = await createAuthClient(egoCredentials);
  }
  return clients[cluster].getAuth();
};
