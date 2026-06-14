import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createAttachAuthContextMiddleware } from "../../middleware/attachAuthContext.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

test("attachAuthContext middleware writes verified context onto req", async () => {
  const app = express();
  app.use(express.json());
  app.use(
    createAttachAuthContextMiddleware({
      verifySession: async (headers) => {
        assert.equal(headers.authorization, "Bearer valid-supabase-jwt");
        return {
          userId: "user_123",
          tenantId: "user_123",
          email: "user@example.com",
          provider: "discord",
          discordAccountId: "discord_456",
          role: "authenticated"
        };
      }
    })
  );
  app.get("/probe", (req, res) => {
    res.json({ authContext: req.authContext });
  });

  const response = await invokeApp(app, {
    method: "GET",
    path: "/probe",
    headers: {
      authorization: "Bearer valid-supabase-jwt"
    }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), {
    authContext: {
      userId: "user_123",
      tenantId: "user_123",
      email: "user@example.com",
      provider: "discord",
      discordAccountId: "discord_456",
      role: "authenticated"
    }
  });
});
