import vault, { VaultOptions } from "node-vault";
import {
  VAULT_URL,
  VAULT_ROLE,
  VAULT_TOKEN,
  VAULT_AUTH_METHOD,
  VAULT_K8_TOKEN_PATH
} from "config";
import { promises } from "fs";
import logger from "logger";

export const createVaultClient = async (vaultOptions: VaultOptions = {}) => {
  const options: VaultOptions = {
    apiVersion: "v1",
    endpoint: VAULT_URL,
    token: VAULT_TOKEN,
    ...vaultOptions
  };
  const vaultClient = vault(options);

  if (VAULT_AUTH_METHOD === "kubernetes") {
    const k8Token =
      VAULT_TOKEN || (await promises.readFile(VAULT_K8_TOKEN_PATH, "utf-8"));
    await vaultClient.kubernetesLogin({
      role: VAULT_ROLE,
      jwt: k8Token
    });
  }
  return vaultClient;
};

export const loadVaultSecret = (
  vaultClient: ReturnType<typeof createVaultClient>
) => async (path: string) => {
  const result = await (await vaultClient).read(path);
  logger.info(`Loaded Vault secret at ${path}`);
  return result.data as { [k: string]: any };
};
