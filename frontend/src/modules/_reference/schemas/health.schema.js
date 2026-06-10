export function isHealthResponse(value) {
  return Boolean(value && typeof value.status === "string");
}
