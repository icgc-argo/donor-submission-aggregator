import createEgoUtils from "@icgc-argo/ego-token-utils";
import { EGO_URL } from "config";
import logger from "logger";
import fetch from "node-fetch";
import urljoin from "url-join";

export default async () => {
  const egoPubliKey: string = await getPublicKey();
  const TokenUtils = createEgoUtils(egoPubliKey);
  return {
    ...TokenUtils,
    isExpiredToken: (decodedToken: ReturnType<typeof TokenUtils.decodeToken>) =>
      decodedToken.exp < new Date().getUTCMilliseconds(),
  };
};

const getPublicKey = async (): Promise<string> => {
  logger.info("fetching ego public key...");
  try {
    const url = urljoin(EGO_URL, "api/oauth/token/public_key");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
      },
    });

    const key = await response.text();
    if (
      response.status != 200 ||
      key.indexOf("-----BEGIN PUBLIC KEY-----") === -1
    ) {
      throw new Error(`failed to fetch valid JwtPublicKey, response:  ${key}`);
    }
    const correctFormatKey = `-----BEGIN PUBLIC KEY-----\n${key
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .trim()}\n-----END PUBLIC KEY-----`;

    return correctFormatKey;
  } catch (err) {
    logger.error(`Failed to fetch ego public key ${err}`);
    throw new Error(err);
  }
};
