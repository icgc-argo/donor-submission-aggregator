import vault, { VaultOptions } from "node-vault";
import { VAULT_URL, VAULT_ROLE, VAULT_TOKEN, VAULT_AUTH_METHOD } from "config";
import { promises, realpathSync } from "fs";
import memoize from "lodash/memoize";
import logger from "logger";

/**
 * Memoized client factory for a singleton Vault client
 */
export const createVaultClient = memoize(
  async (vaultOptions: VaultOptions = {}) => {
    const options: VaultOptions = {
      apiVersion: "v1",
      endpoint: VAULT_URL,
      token: VAULT_TOKEN,
      ...vaultOptions
    };
    const vaultClient = vault(options);

    if (VAULT_AUTH_METHOD === "kubernetes") {
      const k8Token =
        VAULT_TOKEN ||
        (await promises.readFile(
          "/var/run/secrets/kubernetes.io/serviceaccount/token",
          "utf-8"
        ));
      await vaultClient.kubernetesLogin({
        role: VAULT_ROLE,
        jwt: k8Token
      });
    }
    return vaultClient;
  }
);

export const loadVaultSecret = (
  vaultClient: ReturnType<typeof createVaultClient> = createVaultClient()
) => async (path: string) => {
  const result = await (await vaultClient).read(path);
  logger.info(`Loaded Vault secret at ${path}`);
  return result.data as { [k: string]: any };
};
