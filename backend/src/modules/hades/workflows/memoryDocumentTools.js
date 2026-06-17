export function createMemoryDocumentTools({ memoryRepository, documentRepository, artifactRepository } = {}) {
  const tools = [
    {
      name: "memory.searchProfileContext",
      requiresApproval: false,
      execute: async (input) => {
        if (!memoryRepository?.search) return [];
        const query = {
          query: input.query,
          userId: input.userId,
          tenantId: input.tenantId,
        };
        return memoryRepository.search(query);
      },
    },
    {
      name: "document.readText",
      requiresApproval: false,
      execute: async (input) => {
        if (!documentRepository?.getText) return null;
        return documentRepository.getText(input);
      },
    },
    {
      name: "artifact.save",
      requiresApproval: false,
      execute: async (input) => {
        if (!artifactRepository?.save) return null;
        return artifactRepository.save(input);
      },
    },
  ];

  return tools;
}
