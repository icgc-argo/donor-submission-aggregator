import {
  AuthClient,
  createAuthClient,
  getEgoAppCredentials,
} from "external/ego/utils";
import { EGO_URL_DCC, EGO_URL_RDPC } from "config";

/**
 * Keep single instance of auth client for fetching RDPC and DCC credentials
 */
let clients: { rdpc: AuthClient; dcc: AuthClient };

const egoHosts = { dcc: EGO_URL_DCC, rdpc: EGO_URL_RDPC };

export const getEgoToken = async (cluster: "dcc" | "rdpc"): Promise<string> => {
  if (!clients[cluster]) {
    const egoCredentials = await getEgoAppCredentials(cluster);
    clients[cluster] = await createAuthClient(
      egoHosts[cluster],
      egoCredentials
    );
  }
  return clients[cluster].getAuth();
};
