import { createAttachAuthContextMiddleware } from "./middleware/attachAuthContext.js";
import { createAuthRoutes } from "./routes/auth.routes.js";

export function register(app) {
  app.use("/api/auth", createAuthRoutes());
  app.use(createAttachAuthContextMiddleware());
  return {
    detail: "auth boundary helpers",
    children: [{ id: "auth", role: "api", mount: "/api/auth" }]
  };
}
