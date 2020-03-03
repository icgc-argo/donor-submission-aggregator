import {
  MONGO_PASS,
  MONGO_URL,
  MONGO_USER,
  USE_VAULT,
  VAULT_MONGO_SECRET_PATH
} from "config";
import mongoose from "mongoose";
import { vaultSecretLoader } from "vault";

export default async () => {
  let mongoCredentials = {};
  if (USE_VAULT) {
    const loadSecret = await vaultSecretLoader;
    const secret = await loadSecret()(VAULT_MONGO_SECRET_PATH);
    console.log("secret: ", secret);
  }
  await mongoose.connect(MONGO_URL, {
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
    ...(MONGO_USER && MONGO_PASS
      ? {
          user: MONGO_USER,
          pass: MONGO_PASS
        }
      : {})
  });
};
