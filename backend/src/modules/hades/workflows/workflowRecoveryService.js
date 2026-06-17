export function createWorkflowRecoveryService({ runStateRepository }) {
  return {
    async markStaleRunsRecoverable({ olderThanMs, now }) {
      const staleRuns = await runStateRepository.listStaleRuns();
      const cutoff = new Date(now.getTime() - olderThanMs);
      const recovered = [];

      for (const run of staleRuns) {
        const updatedAt = new Date(run.updated_at);
        if (updatedAt < cutoff) {
          const result = await runStateRepository.markRecoverable(run);
          recovered.push(result);
        }
      }

      return recovered;
    },
  };
}
