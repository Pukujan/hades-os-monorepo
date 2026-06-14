import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../../core/app.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

const AUTH_OVERRIDE = {
  auth: {
    requireHadesAuth: async () => ({
      userId: "test-user",
      tenantId: "tenant_test-user",
      sessionToken: "test-token",
    }),
  },
};

const AUTH_HEADERS = { authorization: "Bearer test-token" };

test("GET /api/hades/bootstrap returns app hydration state", async () => {
  const { app } = await createApp({ overrides: AUTH_OVERRIDE });
  const response = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/bootstrap",
    headers: AUTH_HEADERS,
  });

  assert.equal(response.status, 200);
  const body = JSON.parse(response.body);
  assert.deepEqual(body.authContext, { userId: "test-user", tenantId: "tenant_test-user" });
  assert.ok(Array.isArray(body.minions));
  assert.ok(Array.isArray(body.assignments));
});

test("GET /api/hades/bootstrap reflects saved minion and assignment", async () => {
  const { app } = await createApp({ overrides: AUTH_OVERRIDE });
  const draft = {
    name: "Task Helper",
    description: "Turns messy notes into clean task cards.",
    category: "task",
    targetSocial: "private",
    triggerType: "manual",
    commandName: null,
    action: "turn messy instructions into simple task cards",
    responseStyle: "helpful",
    safetyMode: "ask_first",
    testInput: null,
    status: "tested"
  };

  const saveResponse = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/minions",
    headers: AUTH_HEADERS,
    body: { draft, idempotencyKey: "bootstrap-save-1" }
  });
  const saved = JSON.parse(saveResponse.body).minion;

  await invokeApp(app, {
    method: "POST",
    path: "/api/hades/assignments",
    headers: AUTH_HEADERS,
    body: {
      minionId: saved.id,
      socialLinkId: "discord",
      commandName: "!task",
      idempotencyKey: "bootstrap-assign-1"
    }
  });

  const response = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/bootstrap",
    headers: AUTH_HEADERS,
  });
  const body = JSON.parse(response.body);

  assert.equal(body.minions.some((entry) => entry.id === saved.id), true);
  assert.equal(body.assignments.length, 1);
});

