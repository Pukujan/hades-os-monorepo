export function createExternalAdapterRegistry({ firecrawl, mcpClients, playwrightBridge } = {}) {
  const definitions = [];

  if (firecrawl?.scrape) {
    definitions.push({
      name: "external.firecrawl.scrape",
      requiresApproval: false,
      audit: true,
      execute: async (input) => firecrawl.scrape(input),
    });
  }

  if (mcpClients) {
    for (const [clientName, client] of Object.entries(mcpClients)) {
      if (client?.callTool) {
        definitions.push({
          name: `external.mcp.${clientName}.callTool`,
          requiresApproval: false,
          audit: true,
          execute: async (input) => client.callTool(input),
        });
      }
    }
  }

  if (playwrightBridge?.proposeActions) {
    definitions.push({
      name: "browser.playwright.proposeActions",
      requiresApproval: true,
      audit: true,
      execute: async (input) => playwrightBridge.proposeActions(input),
    });
  }

  function listToolDefinitions() {
    return definitions;
  }

  return { listToolDefinitions };
}
