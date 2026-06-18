export function createHermesArtifactStore({ objectStore, defaultTtlSeconds = 3600 } = {}) {
  function validateScoping({ userId, tenantId, objectKey }) {
    const expectedPrefix = `tenants/${tenantId}/users/${userId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new Error(
        `Object key scoping mismatch: expected tenant ${tenantId} user ${userId} but got ${objectKey}`
      );
    }
  }

  async function resolveSignedUrl({ userId, tenantId, objectKey }) {
    validateScoping({ userId, tenantId, objectKey });
    const { url } = await objectStore.createSignedUrl({ key: objectKey, expiresInSeconds: defaultTtlSeconds });
    return url;
  }

  return { resolveSignedUrl };
}
