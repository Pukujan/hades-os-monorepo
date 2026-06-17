import { test } from "node:test";
import assert from "node:assert/strict";
import { createExtensionKeyRepository } from "../../workflows/extensionKeyRepository.js";

function createFakeSupabaseClient() {
  const rows = [];
  return {
    rows,
    from() {
      return {
        insert(obj, _opts) {
          rows.push({ ...obj });
          return Promise.resolve({ data: obj, error: null });
        },
        upsert(obj, _opts) {
          const idx = rows.findIndex((r) => r.id === obj.id);
          if (idx >= 0) rows[idx] = { ...rows[idx], ...obj };
          else rows.push({ ...obj });
          return Promise.resolve({ data: obj, error: null });
        },
        update(updates) {
          return {
            eq(col, val) {
              for (const r of rows) {
                if (r[col] === val) Object.assign(r, updates);
              }
              return Promise.resolve({ data: updates, error: null });
            },
          };
        },
        select(cols) {
          if (cols === "*" || !cols) {
            return Promise.resolve({ data: [...rows], error: null });
          }
          return {
            eq(col, val) {
              const filtered = rows.filter((r) => r[col] === val);
              return Promise.resolve({ data: filtered, error: null });
            },
            order(_col, _dir) {
              return Promise.resolve({ data: [...rows], error: null });
            },
          };
        },
      };
    },
  };
}

test("extension key repository with supabase storage persists created key", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createExtensionKeyRepository({ storage: "supabase", supabaseClient: supabase });

  const { plaintextKey, record } = await repo.createKey({
    userId: "user-a",
    tenantId: "tenant-a",
    data: { name: "Chrome", scopes: ["workflow:read", "document:upload"] },
  });

  assert.ok(plaintextKey.startsWith("hx_"));
  assert.ok(record.id);
  assert.equal(record.name, "Chrome");
  assert.deepEqual(record.scopes, ["workflow:read", "document:upload"]);
  assert.equal(record.user_id, "user-a");
  assert.equal(record.tenant_id, "tenant-a");
  assert.equal(record.revoked_at, null);

  // Verify the key was persisted to the fake DB
  assert.equal(supabase.rows.length, 1);
  assert.equal(supabase.rows[0].id, record.id);
  assert.ok(supabase.rows[0].key_hash);
  assert.equal(supabase.rows[0].key_hash.length, 64); // SHA-256 hex
});

test("extension key repository with supabase storage verifies persisted key", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createExtensionKeyRepository({ storage: "supabase", supabaseClient: supabase });

  const { plaintextKey } = await repo.createKey({
    userId: "user-a",
    tenantId: "tenant-a",
    data: { name: "Chrome", scopes: ["workflow:read"] },
  });

  const result = await repo.verifyKey({ plaintextKey, requiredScope: "workflow:read" });
  assert.ok(result);
  assert.equal(result.userId, "user-a");
  assert.equal(result.tenantId, "tenant-a");
  assert.ok(result.scopes.includes("workflow:read"));

  // Wrong scope should fail
  const noScope = await repo.verifyKey({ plaintextKey, requiredScope: "document:upload" });
  assert.equal(noScope, null);
});

test("extension key repository with supabase storage lists keys for a user", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createExtensionKeyRepository({ storage: "supabase", supabaseClient: supabase });

  await repo.createKey({ userId: "user-a", tenantId: "tenant-a", data: { name: "Key 1" } });
  await repo.createKey({ userId: "user-a", tenantId: "tenant-a", data: { name: "Key 2" } });
  await repo.createKey({ userId: "user-b", tenantId: "tenant-a", data: { name: "Other key" } });

  const keys = await repo.listKeys({ userId: "user-a", tenantId: "tenant-a" });
  assert.equal(keys.length, 2);
  assert.equal(keys[0].name, "Key 1");
  assert.equal(keys[1].name, "Key 2");
});

test("extension key repository with supabase storage revokes a key", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createExtensionKeyRepository({ storage: "supabase", supabaseClient: supabase });

  const { plaintextKey, record } = await repo.createKey({
    userId: "user-a",
    tenantId: "tenant-a",
    data: { name: "Chrome" },
  });

  const revoked = await repo.revokeKey({
    id: record.id,
    userId: "user-a",
    tenantId: "tenant-a",
  });
  assert.ok(revoked.revoked_at);

  // Verify key should now return null
  const result = await repo.verifyKey({ plaintextKey });
  assert.equal(result, null);
});

test("extension key repository with supabase storage rotates a key", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createExtensionKeyRepository({ storage: "supabase", supabaseClient: supabase });

  const { plaintextKey: oldKey, record } = await repo.createKey({
    userId: "user-a",
    tenantId: "tenant-a",
    data: { name: "Chrome" },
  });

  const rotated = await repo.rotateKey({
    id: record.id,
    userId: "user-a",
    tenantId: "tenant-a",
  });
  assert.ok(rotated);
  assert.notEqual(rotated.plaintextKey, oldKey);

  // Old key should be invalid
  const oldResult = await repo.verifyKey({ plaintextKey: oldKey });
  assert.equal(oldResult, null);

  // New key should be valid
  const newResult = await repo.verifyKey({ plaintextKey: rotated.plaintextKey });
  assert.ok(newResult);
  assert.equal(newResult.userId, "user-a");
});

test("extension key repository with supabase storage replicates user_id and tenant_id in DB", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createExtensionKeyRepository({ storage: "supabase", supabaseClient: supabase });

  await repo.createKey({
    userId: "user-a",
    tenantId: "tenant-a",
    data: { name: "Chrome", scopes: ["workflow:read"] },
  });

  const row = supabase.rows[0];
  assert.equal(row.user_id, "user-a");
  assert.equal(row.tenant_id, "tenant-a");
});
