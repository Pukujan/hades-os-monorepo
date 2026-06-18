import { test } from "node:test";
import assert from "node:assert/strict";
import { createInstagramConnectionRepository } from "../../repositories/instagramConnectionRepository.js";

function createFakeSupabaseClient() {
  const rows = [];
  return {
    rows,
    from() {
      return {
        upsert(obj) {
          const idx = rows.findIndex((r) => r.id === obj.id);
          if (idx >= 0) rows[idx] = { ...rows[idx], ...obj };
          else rows.push({ ...obj });
          return Promise.resolve({ data: obj, error: null });
        },
        select() {
          return Promise.resolve({ data: [...rows], error: null });
        },
        delete() {
          return {
            eq(col, val) {
              for (let i = rows.length - 1; i >= 0; i--) {
                if (rows[i][col] === val) rows.splice(i, 1);
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };
}

const USER = { userId: "u1", tenantId: "t1" };
const OTHER_USER = { userId: "u2", tenantId: "t2" };

test("instagramConnectionRepository — createOrUpdate creates a connection record", async () => {
  const repo = createInstagramConnectionRepository({ storage: "memory" });
  const record = await repo.createOrUpdate({
    ...USER,
    connector: "composio",
    externalConnectionId: "ca_abc123",
    instagramBusinessAccountId: "17841400008460056",
    handle: "my_brand",
    status: "connected",
    capabilities: ["dm.read", "dm.send"],
  });

  assert.ok(record.id, "has id");
  assert.equal(record.user_id, "u1");
  assert.equal(record.external_connection_id, "ca_abc123");
  assert.equal(record.instagram_business_account_id, "17841400008460056");
  assert.equal(record.handle, "my_brand");
  assert.equal(record.status, "connected");
  assert.deepEqual(record.capabilities, ["dm.read", "dm.send"]);
});

test("instagramConnectionRepository — createOrUpdate updates existing record for same user", async () => {
  const repo = createInstagramConnectionRepository({ storage: "memory" });
  await repo.createOrUpdate({
    ...USER,
    externalConnectionId: "ca_abc123",
    handle: "old_handle",
  });
  const updated = await repo.createOrUpdate({
    ...USER,
    externalConnectionId: "ca_xyz789",
    handle: "new_handle",
    instagramBusinessAccountId: "17841400008460056",
  });

  assert.equal(updated.handle, "new_handle");
  assert.equal(updated.external_connection_id, "ca_xyz789");
});

test("instagramConnectionRepository — findPublicByUser returns connection for matching user", async () => {
  const repo = createInstagramConnectionRepository({ storage: "memory" });
  await repo.createOrUpdate({
    ...USER,
    externalConnectionId: "ca_abc123",
    handle: "my_brand",
  });
  await repo.createOrUpdate({
    ...OTHER_USER,
    externalConnectionId: "ca_other",
    handle: "other_brand",
  });

  const result = await repo.findPublicByUser(USER);
  assert.ok(result, "found record");
  assert.equal(result.handle, "my_brand");
  assert.equal(result.user_id, "u1");
});

test("instagramConnectionRepository — findPublicByUser returns null when no connection exists", async () => {
  const repo = createInstagramConnectionRepository({ storage: "memory" });
  const result = await repo.findPublicByUser(USER);
  assert.equal(result, null);
});

test("instagramConnectionRepository — findRuntimeByExternalConnectionId returns runtime data", async () => {
  const repo = createInstagramConnectionRepository({ storage: "memory" });
  await repo.createOrUpdate({
    ...USER,
    externalConnectionId: "ca_abc123",
    instagramBusinessAccountId: "17841400008460056",
    handle: "my_brand",
  });

  const runtime = await repo.findRuntimeByExternalConnectionId({ externalConnectionId: "ca_abc123" });
  assert.ok(runtime, "found runtime record");
  assert.equal(runtime.composioConnectionId, "ca_abc123");
  assert.equal(runtime.instagramBusinessAccountId, "17841400008460056");
  assert.equal(runtime.handle, "my_brand");
});

test("instagramConnectionRepository — findRuntimeByExternalConnectionId returns null for unknown connection", async () => {
  const repo = createInstagramConnectionRepository({ storage: "memory" });
  const result = await repo.findRuntimeByExternalConnectionId({ externalConnectionId: "ca_nonexistent" });
  assert.equal(result, null);
});

test("instagramConnectionRepository — delete removes connection by user/tenant", async () => {
  const repo = createInstagramConnectionRepository({ storage: "memory" });
  await repo.createOrUpdate({
    ...USER,
    externalConnectionId: "ca_abc123",
    handle: "my_brand",
  });

  const deleted = await repo.delete(USER);
  assert.ok(deleted, "returned deleted record");
  assert.equal(deleted.user_id, "u1");

  const after = await repo.findPublicByUser(USER);
  assert.equal(after, null);
});

test("instagramConnectionRepository — supabase mode persists and hydrates records", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createInstagramConnectionRepository({ storage: "supabase", supabaseClient: supabase });

  await repo.createOrUpdate({
    ...USER,
    externalConnectionId: "ca_abc123",
    instagramBusinessAccountId: "17841400008460056",
    handle: "my_brand",
    capabilities: ["dm.read"],
  });

  // Create a fresh repo instance to test hydration
  const repo2 = createInstagramConnectionRepository({ storage: "supabase", supabaseClient: supabase });
  const result = await repo2.findPublicByUser(USER);

  assert.ok(result, "hydrated from supabase");
  assert.equal(result.handle, "my_brand");
  assert.equal(result.external_connection_id, "ca_abc123");
});
