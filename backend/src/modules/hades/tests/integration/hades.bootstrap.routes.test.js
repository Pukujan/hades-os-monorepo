import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../../../core/app.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

test("GET /api/hades/bootstrap returns app hydration state", async () => {
  const { app } = await createApp();
  const response = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/bootstrap"
  });

  assert.equal(response.status, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.userId, "local-user");
  assert.ok(body.conversationId);
  assert.ok(Array.isArray(body.messages));
  assert.ok(Array.isArray(body.minions));
  assert.ok(Array.isArray(body.assignments));
  assert.ok(Array.isArray(body.socialLinks));
  assert.equal(body.draft.status, "incomplete");
  assert.equal(body.source, "memory");
});

test("GET /api/hades/bootstrap reflects saved minion and assignment", async () => {
  const { app } = await createApp();
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
    body: { draft, idempotencyKey: "bootstrap-save-1" }
  });
  const saved = JSON.parse(saveResponse.body).minion;

  await invokeApp(app, {
    method: "POST",
    path: "/api/hades/assignments",
    body: {
      minionId: saved.id,
      socialLinkId: "discord",
      commandName: "!task",
      idempotencyKey: "bootstrap-assign-1"
    }
  });

  const response = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/bootstrap"
  });
  const body = JSON.parse(response.body);

  assert.equal(body.minions.some((entry) => entry.id === saved.id), true);
  assert.equal(body.assignments.length, 1);
});

