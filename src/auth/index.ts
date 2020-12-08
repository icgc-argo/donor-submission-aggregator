import {
  EGO_CLIENT_ID,
  EGO_CLIENT_SECRET,
  VAULT_EGO_SECRET_PATH,
  EGO_URL,
  USE_VAULT,
} from "config";
import logger from "logger";
import fetch from "node-fetch";
import urlJoin from "url-join";
import { createVaultClient, loadVaultSecret } from "vault";
import createEgoUtil from "auth/egoTokenUtils";

export type EgoAccessToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  groups: string;
};

type EgoAppCredential = {
  egoClientId: string;
  egoClientSecret: string;
};

export const createEgoJwtManager = async (): Promise<EgoAccessToken> => {
  let cachedJwt = await getJwt();
  const getLatestJwt = async () => {
    const egoTokenUtil = await createEgoUtil();
    const decodedToken = egoTokenUtil.decodeToken(cachedJwt.access_token);
    cachedJwt = egoTokenUtil.isExpiredToken(decodedToken)
      ? await getJwt()
      : cachedJwt;
    return cachedJwt;
  };
  return getLatestJwt();
};

const getEgoAppCredentials = async (
  vaultClient = createVaultClient()
): Promise<EgoAppCredential> => {
  if (USE_VAULT) {
    const secret = await loadVaultSecret(vaultClient)(VAULT_EGO_SECRET_PATH);
    if (isEgoCredential(secret)) {
      return secret;
    } else {
      throw new Error(
        `vault contains wrong secret shape in ${VAULT_EGO_SECRET_PATH}`
      );
    }
  } else {
    return {
      egoClientId: EGO_CLIENT_ID,
      egoClientSecret: EGO_CLIENT_SECRET,
    };
  }
};

const isEgoCredential = (obj: {
  [k: string]: any;
}): obj is EgoAppCredential => {
  return (
    typeof obj["egoClientId"] === "string" &&
    typeof obj["egoClientSecret"] === "string"
  );
};

const getJwt = async (): Promise<EgoAccessToken> => {
  try {
    const secret = await getEgoAppCredentials();
    const egoClientId = secret.egoClientId;
    const egoClientSecret = secret.egoClientSecret;

    logger.info(`Fetching ego jwt....`);
    const url = urlJoin(
      EGO_URL,
      `/api/oauth/token?client_id=${egoClientId}&client_secret=${egoClientSecret}&grant_type=client_credentials`
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
    });
    const accessToken = (await response.json()) as EgoAccessToken;
    return accessToken;
  } catch (error) {
    logger.error(`Failed to fetch ego jwt: ${error}`);
    throw error;
  }
};
