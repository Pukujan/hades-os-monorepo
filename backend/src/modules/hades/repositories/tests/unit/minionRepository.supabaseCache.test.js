import { test } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  return import("../../minionRepository.js");
}

function createSupabaseClient(initialRows = []) {
  const tables = {
    hades_minions: initialRows.map((row) => ({ ...row })),
  };
  let selectCalls = 0;

  return {
    tables,
    getSelectCalls() {
      return selectCalls;
    },
    from(name) {
      return {
        select() {
          selectCalls += 1;
          return Promise.resolve({
            data: (tables[name] || []).map((row) => ({ ...row })),
            error: null,
          });
        },
        upsert(row) {
          const idx = tables[name].findIndex((entry) => entry.id === row.id);
          if (idx >= 0) tables[name][idx] = { ...tables[name][idx], ...row };
          else tables[name].push({ ...row });
          return Promise.resolve({ error: null });
        },
        delete() {
          return {
            eq(column, value) {
              const idx = tables[name].findIndex((entry) => entry[column] === value);
              if (idx >= 0) tables[name].splice(idx, 1);
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
}

test("supabase-backed minion repository hydrates once across repeated reads", async () => {
  const { createMinionRepository } = await loadRepo();
  const supabaseClient = createSupabaseClient([
    { id: "m1", user_id: "user-1", tenant_id: "tenant-1", name: "One" },
  ]);
  const repo = createMinionRepository({ storage: "supabase", supabaseClient });

  await repo.listByUser({ userId: "user-1", tenantId: "tenant-1" });
  await repo.findById({ id: "m1", userId: "user-1", tenantId: "tenant-1" });
  await repo.listByUser({ userId: "user-1", tenantId: "tenant-1" });

  assert.equal(supabaseClient.getSelectCalls(), 1);
});

test("refresh reloads supabase rows when explicit resync is needed", async () => {
  const { createMinionRepository } = await loadRepo();
  const supabaseClient = createSupabaseClient([
    { id: "m1", user_id: "user-1", tenant_id: "tenant-1", name: "One" },
  ]);
  const repo = createMinionRepository({ storage: "supabase", supabaseClient });

  let rows = await repo.listByUser({ userId: "user-1", tenantId: "tenant-1" });
  assert.equal(rows.length, 1);

  supabaseClient.tables.hades_minions.push({
    id: "m2",
    user_id: "user-1",
    tenant_id: "tenant-1",
    name: "Two",
  });

  rows = await repo.listByUser({ userId: "user-1", tenantId: "tenant-1" });
  assert.equal(rows.length, 1);

  await repo.refresh();
  rows = await repo.listByUser({ userId: "user-1", tenantId: "tenant-1" });
  assert.equal(rows.length, 2);
  assert.equal(supabaseClient.getSelectCalls(), 2);
});
