import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  try {
    return await import("../../telegramConnectionRepository.js");
  } catch (error) {
    throw new Error("Missing telegramConnectionRepository.js", { cause: error });
  }
}

describe("telegramConnectionRepository", () => {
  let repo;
  let crypto;

  beforeEach(async () => {
    crypto = {
      encrypt: (value) => `encrypted:${value}`,
      decrypt: (value) => value.replace("encrypted:", ""),
    };

    const mod = await loadRepo();
    repo = mod.createTelegramConnectionRepository({ storage: "memory", crypto });
  });

  test("stores encrypted_bot_token", async () => {
    const record = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    assert.equal(record.encrypted_bot_token, "encrypted:123456:SECRET");
    assert.notEqual(record.encrypted_bot_token, "123456:SECRET");
  });

  test("stores token_last4", async () => {
    const record = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRETABCD",
      botUsername: "hades_bot",
      status: "connected",
    });

    assert.equal(record.token_last4, "ABCD");
  });

  test("does not return plaintext token in public response", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    const publicRecord = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(publicRecord.encrypted_bot_token, undefined);
    assert.equal(publicRecord.bot_token, undefined);
  });

  test("decrypts token only for runtime send path", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    const runtimeRecord = await repo.findRuntimeTokenByTelegramUserId({
      telegramUserId: "tg_123",
    });

    assert.equal(runtimeRecord.botToken, "123456:SECRET");
  });

  test("marks token_invalid when test fails", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "bad-token",
      botUsername: null,
      status: "token_invalid",
    });

    const record = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(record.status, "token_invalid");
  });

  test("does not return User B connection for User A", async () => {
    await repo.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      telegramUserId: "tg_b",
      botToken: "999:SECRET",
      botUsername: "b_bot",
      status: "connected",
    });

    const record = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assert.equal(record, null);
  });
});
