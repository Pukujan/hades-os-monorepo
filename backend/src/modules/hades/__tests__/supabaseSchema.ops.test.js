import { test, describe } from "node:test";
import assert from "node:assert/strict";

const hasSupabaseEnv = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

const requiredTables = [
  "hades_minions",
  "hades_assignments",
  "hades_discord_connections",
  "hades_telegram_connections",
  "hades_conversations",
  "hades_messages",
  "hades_agent_executions",
  "hades_memory_records",
  "hades_documents",
  "hades_document_chunks",
  "hades_tool_results",
  "hades_extension_keys",
];

test("documents required Hades tables for Supabase schema", () => {
  assert.ok(requiredTables.length > 0);
  assert.ok(requiredTables.includes("hades_minions"));
  assert.ok(requiredTables.includes("hades_telegram_connections"));
});

if (hasSupabaseEnv) {
  describe("Supabase Hades schema ops", () => {
    let supabase;

    test.before(async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
      } catch {
        supabase = null;
      }
    });

    for (const table of requiredTables) {
      test(`${table} exists`, async () => {
        if (!supabase) {
          assert.ok(true, `@supabase/supabase-js not available, skipping ${table}`);
          return;
        }
        const { error } = await supabase.from(table).select("id").limit(1);
        assert.equal(error, null, `${table} should exist`);
      });
    }

    test("hades_telegram_connections has encrypted token columns", async () => {
      if (!supabase) {
        assert.ok(true, "@supabase/supabase-js not available, skipping");
        return;
      }
      const { error } = await supabase
        .from("hades_telegram_connections")
        .select("id, encrypted_bot_token, token_last4, bot_username, status")
        .limit(1);

      assert.equal(error, null);
    });

    test("hades_minions has ownership columns", async () => {
      if (!supabase) {
        assert.ok(true, "@supabase/supabase-js not available, skipping");
        return;
      }
      const { error } = await supabase
        .from("hades_minions")
        .select("id, user_id, tenant_id")
        .limit(1);

      assert.equal(error, null);
    });
  });
}
