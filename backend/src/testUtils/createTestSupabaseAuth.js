export function createTestSupabaseAuth({ tokens = {} } = {}) {
  return {
    async getUserFromToken(token) {
      const user = tokens[token];
      if (!user) return null;
      return {
        id: user.id,
        app_metadata: { tenant_id: user.app_metadata?.tenant_id || user.id },
        email: user.email || `${user.id}@test.com`,
        role: "authenticated",
        identities: [],
      };
    },
  };
}
