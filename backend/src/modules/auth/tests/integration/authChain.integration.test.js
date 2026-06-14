import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createAttachAuthContextMiddleware } from "../../middleware/attachAuthContext.js";
import { verifySupabaseSession } from "../../services/verifySupabaseSession.js";
import { requireHadesAuth } from "../../services/authMiddleware.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

test("full auth chain: valid Supabase session can access protected route", async () => {
  const app = express();
  app.use(express.json());
  app.use(createAttachAuthContextMiddleware({
    verifySession: async (headers) =>
      verifySupabaseSession(headers, {
        supabaseUrl: "https://project.supabase.co",
        supabaseAnonKey: "anon-key",
        fetchImpl: async (url, options) => {
          if (url !== "https://project.supabase.co/auth/v1/user") {
            return { ok: false, async json() { return {}; } };
          }
          return {
            ok: true,
            async json() {
              return {
                id: "user_42",
                email: "user@test.com",
                role: "authenticated",
                app_metadata: { provider: "discord" },
                identities: [{ provider: "discord", provider_id: "discord_789" }]
              };
            }
          };
        }
      })
  }));

  app.get("/api/hades/protected", async (req, res) => {
    try {
      const authCtx = await requireHadesAuth(req, {
        supabaseAuth: { getUserFromToken: async () => req.authContext }
      });
      res.json({ status: "ok", userId: authCtx.userId, tenantId: authCtx.tenantId });
    } catch (err) {
      res.status(401).json({ code: err.code || "error", message: err.message });
    }
  });

  const res = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/protected",
    headers: { authorization: "Bearer valid-supabase-jwt" }
  });

  assert.equal(res.status, 200,
    `Expected 200 from protected route with valid JWT, got ${res.status} ${res.body}`);
  const body = JSON.parse(res.body);
  assert.equal(body.userId, "user_42");
  assert.equal(body.tenantId, "user_42");
});
