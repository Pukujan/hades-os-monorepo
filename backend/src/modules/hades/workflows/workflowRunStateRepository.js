import { randomUUID } from "node:crypto";

export function createWorkflowRunStateRepository({ storage }) {
  const store = {
    runs: new Map(),
    checkpoints: new Map(),
  };

  return {
    async createRun({ userId, tenantId, workflowDefinitionId, input, idempotencyKey }) {
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

      return { id, status: "running", ...{ userId, tenantId, workflowDefinitionId, input, idempotencyKey } };
    },

    async appendCheckpoint({ runId, userId, tenantId, checkpoint }) {
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

      return checkpoint;
    },

    async recoverRun({ runId, userId, tenantId }) {
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
      const existing = store.runs.get(run.id);
      if (existing) {
        existing.status = "recoverable";
        existing.retry_count = (existing.retry_count || 0) + 1;
        existing.updated_at = new Date().toISOString();
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
