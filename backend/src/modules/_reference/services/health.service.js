export function getHealth(config) {
  return {
    module: config.name,
    status: "ok",
    timestamp: new Date().toISOString()
  };
}
