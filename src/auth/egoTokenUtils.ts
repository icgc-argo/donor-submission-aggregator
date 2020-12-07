import createEgoUtils from "@icgc-argo/ego-token-utils";
import { EGO_PUBLIC_KEY } from "config";

const TokenUtils = createEgoUtils(EGO_PUBLIC_KEY);

export default {
  ...TokenUtils,
  isExpiredToken: (decodedToken: ReturnType<typeof TokenUtils.decodeToken>) =>
    decodedToken.exp < new Date().getUTCMilliseconds(),
};
