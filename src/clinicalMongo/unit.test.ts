import { expect } from "chai";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import connectMongo from "./index";
import mongoose from "mongoose";
import { createVaultClient } from "vault";

describe("clinicalMongo", () => {
  let mongoContainer: StartedTestContainer;

  const MONGO_PORT = 27017;
  let MONGO_URL: string;
  let VAULT_URL: string = "http://127.0.0.1:8200";

  before(async () => {
    try {
      mongoContainer = await new GenericContainer("mongo")
        .withExposedPorts(MONGO_PORT)
        .start();
      MONGO_URL = `mongodb://${mongoContainer.getContainerIpAddress()}:${mongoContainer.getMappedPort(
        MONGO_PORT
      )}/clinical`;
    } catch (err) {
      console.error("before >>>>>>>>>>>", err);
    }
  });
  after(async () => {
    await mongoContainer.stop();
  });
  beforeEach(async () => {
    await mongoose.disconnect();
  });
  afterEach(async () => {
    await mongoose.disconnect();
  });
  it("can connect without vault", async () => {
    const connected = await connectMongo({
      mongoUrl: MONGO_URL
    });
    expect(connected).to.be.true;
  });
  it("can connect with vault", async () => {
    const connected = await connectMongo({
      mongoUrl: MONGO_URL,
      useVault: true,
      vaultClient: createVaultClient({
        endpoint: VAULT_URL
      }),
      vaultSecretPath: "kv/clinical/secrets_v1"
    });
    expect(connected).to.be.true;
  });
});
