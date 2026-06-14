export async function persistTable(client, name, mode, row) {
  if (!client?.table) return;
  const table = client.table(name);
  if (mode === "upsert" && typeof table.upsert === "function") {
    await table.upsert(row);
    return;
  }
  if (typeof table.insert === "function") {
    await table.insert(row);
  }
}

export function readTableRows(supabaseClient, tableName) {
  const rows = supabaseClient?.tables?.[tableName];
  return Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
}
