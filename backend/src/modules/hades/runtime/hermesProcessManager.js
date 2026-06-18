import path from "node:path";

export function createHermesProcessManager({ workspaceRoot, workspaceService, stateStore, routing, spawnRuntime, artifactStore } = {}) {
  async function runTask({ userId, tenantId, message }) {
    const workspace = workspaceService
      ? await workspaceService.resolveWorkspace({ userId, tenantId })
      : { homeDir: path.join(workspaceRoot, tenantId, userId) };

    await stateStore.hydrateWorkspace({ userId, tenantId, workspace });

    const { taskId, routingToken } = await routing.issueTask({ userId, tenantId, processId: "auto" });

    const runtime = await spawnRuntime({ userId, tenantId, workspace, taskId, routingToken, artifactStore });

    const result = await runtime.run({ taskId, routingToken, message });

    await stateStore.snapshotWorkspace({ userId, tenantId, workspace });

    return result;
  }

  return { runTask };
}
