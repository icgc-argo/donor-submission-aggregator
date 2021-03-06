import {
  MONGO_PASS,
  MONGO_URL,
  MONGO_USER,
  USE_VAULT,
  VAULT_MONGO_SECRET_PATH
} from "config";
import mongoose from "mongoose";
import { loadVaultSecret, createVaultClient } from "vault";
import logger from "logger";

type MongoSecret = {
  CLINICAL_DB_USERNAME: string;
  CLINICAL_DB_PASSWORD: string;
};

const isMongoSecret = (obj: { [k: string]: any }): obj is MongoSecret => {
  return (
    typeof obj["CLINICAL_DB_USERNAME"] === "string" &&
    typeof obj["CLINICAL_DB_PASSWORD"] === "string"
  );
};

export default async ({
  vaultClient = createVaultClient(),
  useVault = USE_VAULT,
  vaultSecretPath = VAULT_MONGO_SECRET_PATH,
  mongoUrl = MONGO_URL,
  user = MONGO_USER,
  pass = MONGO_PASS
} = {}) => {
  let mongoCredentials = {
    user,
    pass
  };
  if (useVault) {
    const secret = await loadVaultSecret(vaultClient)(vaultSecretPath);
    if (isMongoSecret(secret)) {
      mongoCredentials = {
        user: secret.CLINICAL_DB_USERNAME,
        pass: secret.CLINICAL_DB_PASSWORD
      };
    } else {
      throw new Error(
        `Vault contains wrong secret shape in ${vaultSecretPath}`
      );
    }
  }
  await mongoose.connect(mongoUrl, {
    autoReconnect: true,
    // http://mongodb.github.io/node-mongodb-native/3.1/reference/faq/
    socketTimeoutMS: 10000,
    connectTimeoutMS: 30000,
    keepAlive: true,
    reconnectTries: 10,
    reconnectInterval: 3000,
    bufferCommands: false,
    bufferMaxEntries: 0,
    useNewUrlParser: true,
    useFindAndModify: false,
    ...mongoCredentials
  });
  logger.info(`connected to Mongo at ${MONGO_URL}`);
  return true;
};
