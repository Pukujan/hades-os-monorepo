function sanitizeStorageSegment(value) {
  return String(value || "signed-out")
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "signed-out";
}

export function createHadesStorageKey(key, { userId, scope = "user" } = {}) {
  if (scope === "global") {
    return key;
  }

  const suffix = String(key || "").startsWith("hades.")
    ? String(key).slice("hades.".length)
    : String(key || "state");
  return `hades.user.${sanitizeStorageSegment(userId)}.${suffix}`;
}
