import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesRoutes } from "../../routes/hades.routes.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";
import express from "express";

test("POST /api/hades/chat forwards backend auth context to the service", async () => {
  let receivedContext = null;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authContext = {
      userId: "user_123",
      tenantId: "tenant_123",
      discordAccountId: "discord_456",
      provider: "discord"
    };
    next();
  });
  app.use(
    "/api/hades",
    createHadesRoutes({
      service: {
        async chat(body, authContext) {
          receivedContext = authContext;
          return {
            conversationId: "conv-auth",
            userMessage: { role: "user", content: body.message, userId: authContext.userId },
            assistantMessage: { role: "assistant", content: "ok", status: "completed" },
            draft: { status: "tested" },
            missingFields: [],
            suggestions: [],
            source: "hermes_runtime",
            sessionId: "session-auth"
          };
        },
        async readiness() {
          return { status: "ok" };
        },
        async bootstrap() {
          return { userId: "user_123" };
        },
        async testMinion() {
          return { testRun: { id: "t1" }, draft: { status: "tested" } };
        },
        async saveMinion() {
          return { minion: { id: "m1" } };
        },
        async assignMinion() {
          return { assignment: { id: "a1" } };
        }
      }
    })
  );

  const response = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/chat",
    body: {
      clientMessageId: "msg-auth-1",
      idempotencyKey: "idem-auth-1",
      message: "Make a Discord command",
      currentDraft: {
        name: null,
        description: null,
        category: null,
        targetSocial: null,
        triggerType: null,
        commandName: null,
        action: null,
        responseStyle: "helpful",
        safetyMode: "ask_first",
        testInput: null,
        status: "incomplete"
      }
    },
    headers: {
      "x-auth-context": "present"
    }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(receivedContext, {
    userId: "user_123",
    tenantId: "tenant_123",
    discordAccountId: "discord_456",
    provider: "discord"
  });
});
