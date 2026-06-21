import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createHermesProfileRegistry } from "../../runtime/hermesProfileRegistry.js";

function createRecordingSupabase() {
  const rowsByTable = new Map();
  const calls = [];

  function rows(table) {
    if (!rowsByTable.has(table)) rowsByTable.set(table, []);
    return rowsByTable.get(table);
  }

  return {
    calls,
    rowsByTable,
    from(table) {
      calls.push({ op: "from", table });
      const filters = [];
      const builder = {
        upsert(row) {
          calls.push({ op: "upsert", table, row });
          const tableRows = rows(table);
          const index = tableRows.findIndex((entry) => entry.id === row.id);
          if (index >= 0) tableRows[index] = { ...tableRows[index], ...row };
          else tableRows.push({ ...row });
          return Promise.resolve({ data: row, error: null });
        },
        select(columns = "*") {
          calls.push({ op: "select", table, columns });
          return builder;
        },
        eq(column, value) {
          calls.push({ op: "eq", table, column, value });
          filters.push({ column, value });
          return builder;
        },
        maybeSingle() {
          const record = rows(table).find((row) =>
            filters.every((filter) => row[filter.column] === filter.value)
          );
          return Promise.resolve({ data: record || null, error: null });
        },
        then(resolve, reject) {
          const records = rows(table).filter((row) =>
            filters.every((filter) => row[filter.column] === filter.value)
          );
          return Promise.resolve({ data: records, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

function createDeterministicCrypto() {
  return {
    encrypt: (value) => `encrypted:${Buffer.from(value, "utf8").toString("base64")}`,
    decrypt: (value) => Buffer.from(value.replace(/^encrypted:/, ""), "base64").toString("utf8"),
  };
}

describe("Hermes profile registry Supabase persistence", () => {
  test("persists profile metadata and encrypted API key across registry instances", async () => {
    const supabaseClient = createRecordingSupabase();
    const crypto = createDeterministicCrypto();

    const firstProcess = createHermesProfileRegistry({
      storage: "supabase",
      supabaseClient,
      crypto,
    });

    const saved = await firstProcess.upsertProfile({
      tenantId: "tenant_a",
      userId: "user_a",
      profileName: "tenant_a_user_a",
      hermesHome: "/data/hermes/profiles/tenant_a_user_a",
      apiHost: "127.0.0.1",
      apiPort: 8657,
      edgeBaseUrl: "/api/hades/hermes/tenant_a_user_a/v1",
      apiServerKey: "profile-api-secret",
      gatewayStatus: "running",
    });

    assert.equal(saved.profileName, "tenant_a_user_a");
    assert.equal(Object.hasOwn(saved, "apiServerKey"), false);
    assert.equal(JSON.stringify(saved).includes("profile-api-secret"), false);

    const rows = supabaseClient.rowsByTable.get("hades_hermes_profiles") || [];
    assert.equal(rows.length, 1);
    assert.equal(rows[0].encrypted_api_server_key, "encrypted:cHJvZmlsZS1hcGktc2VjcmV0");
    assert.equal(JSON.stringify(rows[0]).includes('"apiServerKey"'), false);
    assert.equal(JSON.stringify(rows[0]).includes("profile-api-secret"), false);
    assert.equal(rows[0].api_server_key_hash, saved.apiServerKeyHash);

    const afterRestart = createHermesProfileRegistry({
      storage: "supabase",
      supabaseClient,
      crypto,
    });

    const byIdentity = await afterRestart.findProfile({ tenantId: "tenant_a", userId: "user_a" });
    assert.equal(byIdentity.profileName, "tenant_a_user_a");
    assert.equal(byIdentity.apiHost, "127.0.0.1");
    assert.equal(byIdentity.apiPort, 8657);
    assert.equal(byIdentity.edgeBaseUrl, "/api/hades/hermes/tenant_a_user_a/v1");
    assert.equal(Object.hasOwn(byIdentity, "apiServerKey"), false);

    const apiServerKey = await afterRestart.getApiServerKey({ profileName: "tenant_a_user_a" });
    assert.equal(apiServerKey, "profile-api-secret");
  });

  test("requires crypto when Supabase storage must persist a profile API key", async () => {
    const registry = createHermesProfileRegistry({
      storage: "supabase",
      supabaseClient: createRecordingSupabase(),
    });

    await assert.rejects(
      () => registry.upsertProfile({
        tenantId: "tenant_a",
        userId: "user_a",
        profileName: "tenant_a_user_a",
        apiServerKey: "profile-api-secret",
      }),
      (error) => error?.code === "missing_crypto",
    );
  });
});

