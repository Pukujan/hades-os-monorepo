import { persistTable, readTableRows } from "./_supabase.js";

export function createProcessedUpdateRepository({ storage = "memory", supabaseClient, tableName = "hades_processed_telegram_updates" } = {}) {
  const processed = new Set();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (row?.id != null) {
        processed.add(row.id);
      }
    }
  }

  async function has({ updateId, userId, tenantId }) {
    await hydrate();
    if (storage !== "supabase") return processed.has(updateId);
    const { data } = await supabaseClient
      .from(tableName)
      .select("id")
      .eq("id", updateId)
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .limit(1);
    return data && data.length > 0;
  }

  async function mark({ updateId, userId, tenantId, botUsername }) {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, "upsert", {
        id: updateId,
        user_id: userId,
        tenant_id: tenantId,
        bot_username: botUsername || null,
        processed_at: new Date().toISOString(),
      });
    }
    processed.add(updateId);
  }

  return { has, mark };
}
