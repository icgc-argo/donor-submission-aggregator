import vault, { VaultOptions, client } from "node-vault";
import { VAULT_URL, VAULT_ROLE, VAULT_TOKEN } from "config";
import { promises } from "fs";

const K8_VAULT_TOKEN_PATH =
  "/var/run/secrets/kubernetes.io/serviceaccount/token";

export const createVaultClient = async (vaultOptions: VaultOptions = {}) => {
  const options: VaultOptions = {
    apiVersion: "v1",
    endpoint: VAULT_URL,
    ...vaultOptions
  };
  const vaultClient = vault(options);

  const k8Token =
    VAULT_TOKEN || (await promises.readFile(K8_VAULT_TOKEN_PATH, "utf-8"));
  await vaultClient.kubernetesLogin({
    role: VAULT_ROLE,
    jwt: k8Token
  });
  return vaultClient;
};

export const vaultSecretLoader = (async () => {
  const defaultVaultClient = await createVaultClient();
  return (vaultClient = defaultVaultClient) => async (path: string) => {
    const result = await vaultClient.read(path);
    console.log(`loaded ${path}`);
    return result.data.data as string;
  };
})();
