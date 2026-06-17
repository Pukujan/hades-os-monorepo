export function createToolRegistry({ authContext } = {}) {
  const tools = new Map();

  function register(tool) {
    if (!tool || !tool.name) return;
    tools.set(tool.name, tool);
  }

  function registerMany(toolList) {
    if (!Array.isArray(toolList)) return;
    for (const tool of toolList) {
      register(tool);
    }
  }

  function get(toolName) {
    const tool = tools.get(toolName);
    if (!tool) return null;
    return {
      ...tool,
      execute: async (input) => {
        const scopedInput = {
          ...input,
          userId: authContext?.userId || input.userId,
          tenantId: authContext?.tenantId || input.tenantId,
        };
        return tool.execute(scopedInput);
      },
    };
  }

  function list() {
    return [...tools.values()];
  }

  return { register, registerMany, get, list };
}
