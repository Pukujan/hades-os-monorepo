import { randomUUID } from "node:crypto";
import { persistTable, readTableRows } from "../repositories/_supabase.js";

export function createWorkflowRunStateRepository({ storage = "memory", supabaseClient, runsTableName = "hades_workflow_runs", checkpointsTableName = "hades_workflow_run_checkpoints" } = {}) {
  const store = {
    runs: new Map(),
    checkpoints: new Map(),
  };
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, runsTableName)) {
      if (!row?.id) continue;
      store.runs.set(row.id, {
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        workflowDefinitionId: row.workflow_definition_id,
        input: row.input,
        idempotencyKey: row.idempotency_key,
        status: row.status,
        retry_count: row.retry_count || 0,
        lastCheckpoint: row.last_checkpoint,
        completedToolCallIds: row.completed_tool_call_ids || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      store.checkpoints.set(row.id, []);
    }
    for (const row of await readTableRows(supabaseClient, checkpointsTableName)) {
      if (!row?.id) continue;
      const cps = store.checkpoints.get(row.run_id) || [];
      cps.push({
        stepId: row.step_id,
        status: row.status,
        cursor: row.cursor,
        snapshot: row.snapshot,
        completedToolCallIds: row.completed_tool_call_ids,
      });
      store.checkpoints.set(row.run_id, cps);
    }
  }

  async function persistRun(row) {
    if (storage !== "supabase") return;
    await persistTable(supabaseClient, runsTableName, "upsert", {
      id: row.id,
      user_id: row.userId,
      tenant_id: row.tenantId,
      workflow_definition_id: row.workflowDefinitionId,
      input: row.input,
      idempotency_key: row.idempotencyKey,
      status: row.status,
      retry_count: row.retry_count || 0,
      last_checkpoint: row.lastCheckpoint,
      completed_tool_call_ids: row.completedToolCallIds || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  async function persistCheckpoint(runId, checkpoint, run) {
    if (storage !== "supabase") return;
    await persistTable(supabaseClient, checkpointsTableName, "insert", {
      id: randomUUID(),
      user_id: run.userId,
      tenant_id: run.tenantId,
      run_id: runId,
      step_id: checkpoint.stepId,
      status: checkpoint.status,
      cursor: checkpoint.cursor,
      snapshot: checkpoint.snapshot,
      completed_tool_call_ids: checkpoint.completedToolCallIds,
      created_at: new Date().toISOString(),
    });
  }

  return {
    async createRun({ userId, tenantId, workflowDefinitionId, input, idempotencyKey }) {
      await hydrate();
      const id = randomUUID();
      const now = new Date().toISOString();

      const run = {
        id,
        userId,
        tenantId,
        workflowDefinitionId,
        input,
        idempotencyKey,
        status: "running",
        retry_count: 0,
        lastCheckpoint: null,
        completedToolCallIds: [],
        created_at: now,
        updated_at: now,
      };

      store.runs.set(id, run);
      store.checkpoints.set(id, []);
      await persistRun(run);

      return { id, status: "running", ...{ userId, tenantId, workflowDefinitionId, input, idempotencyKey } };
    },

    async appendCheckpoint({ runId, userId, tenantId, checkpoint }) {
      await hydrate();
      const run = store.runs.get(runId);
      if (!run || run.userId !== userId || run.tenantId !== tenantId) {
        throw new Error("Run not found or access denied");
      }

      const cps = store.checkpoints.get(runId) || [];
      cps.push(checkpoint);
      store.checkpoints.set(runId, cps);

      run.lastCheckpoint = checkpoint;
      run.completedToolCallIds = checkpoint.completedToolCallIds || run.completedToolCallIds || [];

      if (checkpoint.status === "paused" || checkpoint.status === "completed") {
        run.status = checkpoint.status;
      }

      run.updated_at = new Date().toISOString();
      await persistRun(run);
      await persistCheckpoint(runId, checkpoint, run);

      return checkpoint;
    },

    async recoverRun({ runId, userId, tenantId }) {
      await hydrate();
      const run = store.runs.get(runId);
      if (!run || run.userId !== userId || run.tenantId !== tenantId) {
        return null;
      }

      const cps = store.checkpoints.get(runId) || [];

      return {
        id: runId,
        status: run.status,
        lastCheckpoint: run.lastCheckpoint || (cps.length > 0 ? cps[cps.length - 1] : null),
        resumeCursor: run.lastCheckpoint?.cursor || (cps.length > 0 ? cps[cps.length - 1]?.cursor : null),
        checkpoints: cps,
        completedToolCallIds: run.completedToolCallIds || [],
      };
    },

    async listStaleRuns() {
      await hydrate();
      const stale = [];
      for (const run of store.runs.values()) {
        if (run.status === "running") {
          stale.push({
            id: run.id,
            user_id: run.userId,
            tenant_id: run.tenantId,
            status: run.status,
            updated_at: run.updated_at,
            last_checkpoint: run.lastCheckpoint,
            retry_count: run.retry_count || 0,
          });
        }
      }
      return stale;
    },

    async markRecoverable(run) {
      await hydrate();
      const existing = store.runs.get(run.id);
      if (existing) {
        existing.status = "recoverable";
        existing.retry_count = (existing.retry_count || 0) + 1;
        existing.updated_at = new Date().toISOString();
        await persistRun(existing);
      }

      return {
        ...run,
        status: "recoverable",
        nextAction: run.last_checkpoint
          ? `Resume from ${run.last_checkpoint.stepId}`
          : "Resume from start",
      };
    },
  };
}
