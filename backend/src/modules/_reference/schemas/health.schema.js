export function isHealthResponse(value) {
  return Boolean(
    value &&
      typeof value.module === "string" &&
      typeof value.status === "string" &&
      typeof value.timestamp === "string"
  );
}
