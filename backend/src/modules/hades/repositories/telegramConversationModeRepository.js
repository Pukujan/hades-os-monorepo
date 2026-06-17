import { persistTable, readTableRows } from "./_supabase.js";

export function createTelegramConversationModeRepository({ storage = "memory", supabaseClient, tableName = "hades_telegram_conversation_modes" } = {}) {
  const modes = new Map();
  let hydrated = false;

  function makeKey({ chatId, userId, tenantId }) {
    return `${chatId}:${userId}:${tenantId}`;
  }

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (row?.chat_id && row?.user_id && row?.tenant_id) {
        const key = makeKey({ chatId: row.chat_id, userId: row.user_id, tenantId: row.tenant_id });
        modes.set(key, row.mode);
      }
    }
  }

  async function getMode({ chatId, userId, tenantId }) {
    await hydrate();
    const key = makeKey({ chatId, userId, tenantId });
    if (modes.has(key)) return modes.get(key);
    return "general";
  }

  async function setMode({ chatId, userId, tenantId, mode }) {
    const key = makeKey({ chatId, userId, tenantId });
    modes.set(key, mode);
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, "upsert", {
        chat_id: chatId,
        user_id: userId,
        tenant_id: tenantId,
        mode,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return { getMode, setMode };
}
