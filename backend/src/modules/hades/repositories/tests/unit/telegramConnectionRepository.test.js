import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

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

  test("fails safely when crypto dependency is missing", async () => {
    const mod = await loadRepo();
    const unsafeRepo = mod.createTelegramConnectionRepository({ storage: "memory", crypto: null });

    await assert.rejects(
      unsafeRepo.createOrUpdate({
        userId: "user_a",
        tenantId: "tenant_a",
        telegramUserId: "tg_123",
        botToken: "123456:SECRET",
        botUsername: "hades_bot",
        status: "connected",
      }),
      (err) => err.code === "missing_crypto"
    );
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

  test("generates a valid UUID v4 id", async () => {
    const record = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_uuid_test",
      botToken: "123456:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.match(record.id, uuidV4, `id "${record.id}" is not a valid UUID v4`);
  });

  test("re-reads from Supabase after cross-instance write (no hydrated guard)", async () => {
    const rows = [];
    const mockSupabase = {
      table: () => ({
        upsert: async (row) => {
          const idx = rows.findIndex(r => r.id === row.id);
          if (idx >= 0) rows[idx] = { ...row };
          else rows.push({ ...row });
        },
      }),
      tables: { hades_telegram_connections: rows },
    };

    const mod = await loadRepo();
    const supabaseRepo = mod.createTelegramConnectionRepository({ storage: "supabase", supabaseClient: mockSupabase, crypto });

    await supabaseRepo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "111:FIRST",
      botUsername: "hades_bot",
      status: "connected",
    });

    // Simulate another instance writing a new row directly to Supabase
    const crossInstanceRow = {
      id: randomUUID(),
      user_id: "user_a",
      tenant_id: "tenant_a",
      telegram_user_id: "tg_456",
      encrypted_bot_token: "encrypted:222:SECOND",
      token_last4: "COND",
      bot_username: "hades_bot2",
      status: "connected",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    rows.push({ ...crossInstanceRow });

    const after = await supabaseRepo.findByTelegramUserId({ telegramUserId: "tg_456" });

    assert.notEqual(after, null, "should see cross-instance row after re-read");
    assert.equal(after.id, crossInstanceRow.id);
  });

  test("reuses existing id on update", async () => {
    const first = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_update_test",
      botToken: "111:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    const second = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_update_test",
      botToken: "222:NEW_SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    assert.equal(second.id, first.id, "id should remain stable on update");
  });
});
