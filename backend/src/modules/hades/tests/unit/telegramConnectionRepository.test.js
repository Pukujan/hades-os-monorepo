import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createTelegramConnectionRepository } from "../../repositories/telegramConnectionRepository.js";

function createMockCrypto() {
  return {
    encrypt: (v) => `enc:${v}`,
    decrypt: (v) => v.replace("enc:", ""),
  };
}

describe("telegramConnectionRepository CRUD", () => {
  let repo;

  beforeEach(() => {
    repo = createTelegramConnectionRepository({
      storage: "memory",
      crypto: createMockCrypto(),
    });
  });

  test("findByUserId returns connection for matching user", async () => {
    await repo.createOrUpdate({
      userId: "user-1",
      tenantId: "tenant-1",
      telegramUserId: "tg-1",
      botToken: "123:secret",
      botUsername: "my_bot",
      status: "connected",
    });

    const result = await repo.findByUserId({ userId: "user-1", tenantId: "tenant-1" });
    assert.ok(result);
    assert.equal(result.telegram_user_id, "tg-1");
    assert.equal(result.bot_username, "my_bot");
  });

  test("findByUserId returns null for non-matching user", async () => {
    await repo.createOrUpdate({
      userId: "user-1",
      tenantId: "tenant-1",
      telegramUserId: "tg-1",
      botToken: "123:secret",
      botUsername: "my_bot",
      status: "connected",
    });

    const result = await repo.findByUserId({ userId: "other-user", tenantId: "tenant-1" });
    assert.equal(result, null);
  });

  test("findByUserId returns null when no connections exist", async () => {
    const result = await repo.findByUserId({ userId: "user-1", tenantId: "tenant-1" });
    assert.equal(result, null);
  });

  test("listByUser returns all connections for a user", async () => {
    await repo.createOrUpdate({
      userId: "user-1",
      tenantId: "tenant-1",
      telegramUserId: "tg-1",
      botToken: "123:secret-a",
      botUsername: "bot_a",
      status: "connected",
    });
    await repo.createOrUpdate({
      userId: "user-1",
      tenantId: "tenant-1",
      telegramUserId: "tg-2",
      botToken: "456:secret-b",
      botUsername: "bot_b",
      status: "connected",
    });
    await repo.createOrUpdate({
      userId: "user-2",
      tenantId: "tenant-2",
      telegramUserId: "tg-3",
      botToken: "789:secret-c",
      botUsername: "bot_c",
      status: "connected",
    });

    const results = await repo.listByUser({ userId: "user-1", tenantId: "tenant-1" });
    assert.equal(results.length, 2);
    const usernames = results.map((r) => r.bot_username).sort();
    assert.deepEqual(usernames, ["bot_a", "bot_b"]);
  });

  test("listByUser returns empty array when no connections exist", async () => {
    const results = await repo.listByUser({ userId: "user-1", tenantId: "tenant-1" });
    assert.deepEqual(results, []);
  });

  test("delete removes a connection by id", async () => {
    const record = await repo.createOrUpdate({
      userId: "user-1",
      tenantId: "tenant-1",
      telegramUserId: "tg-1",
      botToken: "123:secret",
      botUsername: "my_bot",
      status: "connected",
    });

    const before = await repo.findByUserId({ userId: "user-1", tenantId: "tenant-1" });
    assert.ok(before);

    const deleted = await repo.delete({ id: record.id });
    assert.ok(deleted);

    const after = await repo.findByUserId({ userId: "user-1", tenantId: "tenant-1" });
    assert.equal(after, null);
  });

  test("delete returns null for non-existent id", async () => {
    const result = await repo.delete({ id: "non-existent-id" });
    assert.equal(result, null);
  });

  test("delete removes connection from both maps", async () => {
    const record = await repo.createOrUpdate({
      userId: "user-1",
      tenantId: "tenant-1",
      telegramUserId: "tg-1",
      botToken: "123:secret",
      botUsername: "my_bot",
      status: "connected",
    });

    const byTgId = await repo.findByTelegramUserId({ telegramUserId: "tg-1" });
    assert.ok(byTgId);

    await repo.delete({ id: record.id });

    const afterTg = await repo.findByTelegramUserId({ telegramUserId: "tg-1" });
    assert.equal(afterTg, null);
  });

  test("delete with supabase storage removes row from supabase", async () => {
    let deletedId = null;
    const fakeSupabase = {
      tables: { hades_telegram_connections: [] },
      from(name) {
        if (name !== "hades_telegram_connections") throw new Error(`Unknown table: ${name}`);
        return this;
      },
      select() {
        return Promise.resolve([]);
      },
      upsert(rows) {
        const list = Array.isArray(rows) ? rows : [rows];
        for (const row of list) {
          const idx = this.tables.hades_telegram_connections.findIndex((r) => r.id === row.id);
          if (idx >= 0) this.tables.hades_telegram_connections[idx] = { ...this.tables.hades_telegram_connections[idx], ...row };
          else this.tables.hades_telegram_connections.push({ ...row });
        }
        return Promise.resolve({ error: null });
      },
      delete() {
        return {
          eq(column, value) {
            deletedId = value;
            const idx = fakeSupabase.tables.hades_telegram_connections.findIndex((r) => r.id === value);
            if (idx >= 0) fakeSupabase.tables.hades_telegram_connections.splice(idx, 1);
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    const supabaseRepo = createTelegramConnectionRepository({
      storage: "supabase",
      supabaseClient: fakeSupabase,
      crypto: createMockCrypto(),
    });

    const record = await supabaseRepo.createOrUpdate({
      userId: "user-1",
      tenantId: "tenant-1",
      telegramUserId: "tg-1",
      botToken: "123:secret",
      botUsername: "my_bot",
      status: "connected",
    });

    assert.equal(fakeSupabase.tables.hades_telegram_connections.length, 1);

    await supabaseRepo.delete({ id: record.id });
    assert.equal(deletedId, record.id);
    assert.equal(fakeSupabase.tables.hades_telegram_connections.length, 0);
  });
});
