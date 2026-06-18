export function createHermesRuntimeSpawner({ hermesRuntimeServiceFactory } = {}) {
  async function spawnRuntime({ userId, tenantId, workspace, taskId, routingToken }) {
    const runtimeService = hermesRuntimeServiceFactory({ runCommand: undefined });

    return {
      id: taskId,
      async run({ message } = {}) {
        const result = await runtimeService.generateCommandResult({
          input: { content: message },
          context: { userId, chatId: taskId, conversationType: "general" },
        });
        return {
          taskId,
          routingToken,
          reply: result.assistantText,
          actions: result.outboundActions || [],
        };
      },
      async stop() {},
      status() {
        return { state: "ready" };
      },
    };
  }

  return { spawnRuntime };
}
