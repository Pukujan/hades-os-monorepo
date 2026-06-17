export async function persistTable(client, name, mode, row) {
  if (!client) return;
  if (typeof client.from === "function") {
    const table = client.from(name);
    if (mode === "upsert") {
      const { error } = await table.upsert(row);
      if (error) throw new Error(`Supabase persist error (${name}): ${error.message}`);
      return;
    }
    const { error } = await table.insert(row);
    if (error) throw new Error(`Supabase persist error (${name}): ${error.message}`);
    return;
  }
  if (typeof client.table === "function") {
    const table = client.table(name);
    if (mode === "upsert" && typeof table.upsert === "function") {
      await table.upsert(row);
      return;
    }
    if (typeof table.insert === "function") {
      await table.insert(row);
    }
  }
}

export async function readTableRows(supabaseClient, tableName) {
  if (!supabaseClient) return [];
  if (typeof supabaseClient.from === "function") {
    const { data, error } = await supabaseClient.from(tableName).select("*");
    if (error) return [];
    return data || [];
  }
  if (typeof supabaseClient.table === "function") {
    const rows = supabaseClient?.tables?.[tableName];
    return Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
  }
  return [];
}

export async function deleteTableRow(supabaseClient, tableName, id) {
  if (!supabaseClient) return false;
  if (typeof supabaseClient.from === "function") {
    const { error } = await supabaseClient.from(tableName).delete().eq("id", id);
    if (error) throw new Error(`Supabase delete error (${tableName}): ${error.message}`);
    return true;
  }
  if (typeof supabaseClient.table === "function") {
    const rows = supabaseClient?.tables?.[tableName];
    if (!Array.isArray(rows)) return false;
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    rows.splice(idx, 1);
    return true;
  }
  return false;
}
