import egoTokenUtils from "@icgc-argo/ego-token-utils";
import fetch from "node-fetch";
import urlJoin from "url-join";
import {
  USE_VAULT,
  VAULT_SECRET_PATH_EGO_APP_RDPC,
  VAULT_SECRET_PATH_EGO_APP_DCC,
  EGO_APP_RDPC_CLIENT_ID,
  EGO_APP_RDPC_CLIENT_SECRET,
  EGO_APP_DCC_CLIENT_ID,
  EGO_APP_DCC_CLIENT_SECRET,
} from "config";
import { createVaultClient, loadVaultSecret } from "vault";
import logger from "logger";

export type EgoApplicationCredential = {
  clientId: string;
  clientSecret: string;
};

export type AuthClient = {
  getAuth: () => Promise<string>;
};

type EgoAccessToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  groups: string;
};

type EgoAccessTokenError = {
  error: string;
  error_description: string;
};

const getPublicKey = async (egoHost: string): Promise<string> => {
  const url = urlJoin(egoHost, "api/oauth/token/public_key");
  const response = await fetch(url);
  const key = await response.text();

  if (!response.ok) {
    throw new Error(
      `Ego public key fetch failed with non-200 response: ${response.status} ${response.statusText}`
    );
  }

  return key;
};

const getApplicationJwt = async (
  egoHost: string,
  applicationCredentials: EgoApplicationCredential
): Promise<string> => {
  const url = urlJoin(
    egoHost,
    `/oauth/token?client_id=${applicationCredentials.clientId}&client_secret=${applicationCredentials.clientSecret}&grant_type=client_credentials`
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Auth request failed with non-200 response: ${response.status} ${response.statusText}`
    );
  }

  const authResponse = await response.json();

  if (authResponse.error) {
    throw new Error(
      `Failed to authorize application: ${
        (authResponse as EgoAccessTokenError).error_description
      }`
    );
  }

  return (authResponse as EgoAccessToken).access_token;
};

export const createAuthClient = async (
  egoHost: string,
  appCredentials: EgoApplicationCredential
): Promise<AuthClient> => {
  let latestJwt: string;

  const publicKey = await getPublicKey(egoHost);
  const tokenUtils = egoTokenUtils(publicKey);

  const getAuth = async () => {
    if (latestJwt && tokenUtils.isValidJwt(latestJwt)) {
      return latestJwt;
    }
    logger.debug(`Fetching new token from ego...`);
    latestJwt = await getApplicationJwt(egoHost, appCredentials);
    return latestJwt;
  };

  return {
    getAuth,
  };
};

export const getEgoAppCredentials = async (
  cluster: "rdpc" | "dcc"
): Promise<EgoApplicationCredential> => {
  const vaultPath =
    cluster === "rdpc"
      ? VAULT_SECRET_PATH_EGO_APP_RDPC
      : VAULT_SECRET_PATH_EGO_APP_DCC;
  if (USE_VAULT && vaultPath) {
    const vaultClient = createVaultClient();
    const secret = await loadVaultSecret(vaultClient)(vaultPath);
    if (isEgoCredential(secret)) {
      return secret;
    } else {
      throw new Error(`vault contains wrong secret shape in ${vaultPath}`);
    }
  } else {
    return {
      clientId:
        cluster === "rdpc" ? EGO_APP_RDPC_CLIENT_ID : EGO_APP_DCC_CLIENT_ID,
      clientSecret:
        cluster === "rdpc"
          ? EGO_APP_RDPC_CLIENT_SECRET
          : EGO_APP_DCC_CLIENT_SECRET,
    };
  }
};

const isEgoCredential = (obj: {
  [k: string]: any;
}): obj is EgoApplicationCredential => {
  return (
    typeof obj["egoClientId"] === "string" &&
    typeof obj["egoClientSecret"] === "string"
  );
};
