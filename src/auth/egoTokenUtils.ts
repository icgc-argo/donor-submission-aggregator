import createEgoUtils from "@icgc-argo/ego-token-utils";
import { getPublicKey } from "auth";

export default async () => {
  const egoPubliKey: string = await getPublicKey();
  const TokenUtils = createEgoUtils(egoPubliKey);
  return {
    ...TokenUtils,
    isExpiredToken: (decodedToken: ReturnType<typeof TokenUtils.decodeToken>) =>
      decodedToken.exp < new Date().getUTCMilliseconds(),
  };
};
