import { persistTable, readTableRows, deleteTableRow } from "./_supabase.js";
import { randomUUID } from "node:crypto";

function last4(token) {
  if (!token || token.length < 4) return token || "";
  return token.slice(-4);
}

export function createTelegramConnectionRepository({ storage = "memory", supabaseClient, tableName = "hades_telegram_connections", crypto = null } = {}) {
  const connections = new Map();
  const byTelegramUserId = new Map();

  async function hydrate() {
    if (storage !== "supabase") return;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      connections.set(row.id, { ...row });
      if (row.telegram_user_id) {
        byTelegramUserId.set(row.telegram_user_id, connections.get(row.id));
      }
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function createOrUpdate({ userId, tenantId, telegramUserId, botToken, botUsername, status }) {
    await hydrate();
    if (!crypto || typeof crypto.encrypt !== "function") {
      throw Object.assign(
        new Error("Crypto dependency is required to store Telegram bot tokens"),
        { code: "missing_crypto" }
      );
    }
    const existing = byTelegramUserId.get(telegramUserId);
    const id = existing?.id || randomUUID();
    const encrypted = crypto.encrypt(botToken);

    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      telegram_user_id: telegramUserId,
      encrypted_bot_token: encrypted,
      token_last4: last4(botToken),
      bot_username: botUsername || null,
      status: status || "connected",
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    connections.set(id, record);
    byTelegramUserId.set(telegramUserId, record);
    await persist(record);
    return record;
  }

  async function findPublicByUser({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        const { encrypted_bot_token, bot_token, ...rest } = record;
        return rest;
      }
    }
    return null;
  }

  async function findRuntimeTokenByTelegramUserId({ telegramUserId }) {
    await hydrate();
    const record = byTelegramUserId.get(telegramUserId) || null;
    if (!record) return null;
    if (!crypto || typeof crypto.decrypt !== "function") {
      throw Object.assign(
        new Error("Crypto dependency is required to decrypt Telegram bot tokens"),
        { code: "missing_crypto" }
      );
    }
    return { botToken: crypto.decrypt(record.encrypted_bot_token) };
  }

  async function findByTelegramUserId({ telegramUserId }) {
    await hydrate();
    return byTelegramUserId.get(telegramUserId) || null;
  }

  async function findByUserId({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        return record;
      }
    }
    return null;
  }

  async function findRuntimeTokenByUserId({ userId, tenantId }) {
    await hydrate();
    for (const record of connections.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        if (!crypto || typeof crypto.decrypt !== "function") {
          throw Object.assign(
            new Error("Crypto dependency is required to decrypt Telegram bot tokens"),
            { code: "missing_crypto" }
          );
        }
        return { botToken: crypto.decrypt(record.encrypted_bot_token) };
      }
    }
    return null;
  }

  async function listByUser({ userId, tenantId }) {
    await hydrate();
    return [...connections.values()].filter(
      (r) => r.user_id === userId && r.tenant_id === tenantId
    );
  }

  async function deleteRecord({ id }) {
    await hydrate();
    const record = connections.get(id) || null;
    if (!record) return null;
    connections.delete(id);
    if (record.telegram_user_id) {
      byTelegramUserId.delete(record.telegram_user_id);
    }
    if (storage === "supabase") {
      await deleteTableRow(supabaseClient, tableName, id);
    }
    return record;
  }

  return { createOrUpdate, findPublicByUser, findRuntimeTokenByTelegramUserId, findRuntimeTokenByUserId, findByTelegramUserId, findByUserId, listByUser, delete: deleteRecord };
}
