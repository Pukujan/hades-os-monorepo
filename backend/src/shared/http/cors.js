export function createCorsMiddleware(allowedOrigin) {
  const origins = (allowedOrigin || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return function corsMiddleware(req, res, next) {
    const origin = req.headers?.origin || req.headers?.Origin;

    if (origins.length === 0) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (!origin) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (origins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", origins[0]);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  };
}
