import crypto from "node:crypto";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stripSecrets(record, keysToStrip = []) {
  const cleaned = clone(record);
  for (const key of keysToStrip) {
    delete cleaned[key];
  }
  if (Object.hasOwn(cleaned, "rawOutput")) {
    delete cleaned.rawOutput;
  }
  return cleaned;
}

export function createHermesStateRepository({ storage = "memory", supabaseClient } = {}) {
  const stateObjects = new Map();
  const taskRoutes = new Map();
  const runSummaries = new Map();

  async function recordStateObject({ userId, tenantId, kind, objectKey, contentHash, byteSize }) {
    const id = crypto.randomUUID();
    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      kind,
      object_key: objectKey,
      content_hash: contentHash,
      byte_size: byteSize,
      created_at: new Date().toISOString(),
    };

    if (storage === "supabase") {
      const { error } = await supabaseClient.from("hades_hermes_state_objects").insert(record);
      if (error) throw error;
    }

    stateObjects.set(id, record);
    return clone(record);
  }

  async function listStateObjects({ userId, tenantId }) {
    if (storage === "supabase") {
      const { data, error } = await supabaseClient
        .from("hades_hermes_state_objects")
        .select("*")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .order("created_at");
      if (error) throw error;
      return (data || []).map((r) => clone(r));
    }

    return Array.from(stateObjects.values())
      .filter((r) => r.user_id === userId && r.tenant_id === tenantId)
      .map((r) => clone(r));
  }

  async function createTaskRoute({ taskId, userId, tenantId, processId, routingToken, routingTokenHash, destination, capabilityEnvelope }) {
    const record = {
      task_id: taskId,
      user_id: userId,
      tenant_id: tenantId,
      process_id: processId,
      routing_token_hash: routingTokenHash,
      destination: destination || null,
      capability_envelope: capabilityEnvelope || null,
      created_at: new Date().toISOString(),
    };

    if (storage === "supabase") {
      const { error } = await supabaseClient.from("hades_hermes_task_routes").insert(record);
      if (error) throw error;
    }

    taskRoutes.set(taskId, record);
    return stripSecrets(clone(record), ["routingToken"]);
  }

  async function findTaskRoute({ taskId, userId, tenantId }) {
    if (storage === "supabase") {
      const { data, error } = await supabaseClient
        .from("hades_hermes_task_routes")
        .select("*")
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data ? stripSecrets(clone(data), ["routingToken"]) : null;
    }

    const record = taskRoutes.get(taskId);
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return stripSecrets(clone(record), ["routingToken"]);
  }

  async function recordRunSummary({ runId, taskId, userId, tenantId, status, summary, artifactObjects, rawOutput }) {
    const record = {
      run_id: runId,
      task_id: taskId,
      user_id: userId,
      tenant_id: tenantId,
      status,
      summary,
      artifact_objects: artifactObjects || [],
      created_at: new Date().toISOString(),
    };
    runSummaries.set(runId, record);
    return stripSecrets(clone(record), ["rawOutput"]);
  }

  async function listRunSummaries({ userId, tenantId }) {
    return Array.from(runSummaries.values())
      .filter((r) => r.user_id === userId && r.tenant_id === tenantId)
      .map((r) => stripSecrets(clone(r), ["rawOutput"]));
  }

  return { recordStateObject, listStateObjects, createTaskRoute, findTaskRoute, recordRunSummary, listRunSummaries };
}
