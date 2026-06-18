import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocumentRepository } from "../../repositories/documentRepository.js";
import { createContextSpaceRepository } from "../../repositories/contextSpaceRepository.js";
import { createPageCaptureRepository } from "../../repositories/pageCaptureRepository.js";
import { createApprovalRepository } from "../../repositories/approvalRepository.js";
import { createExtensionKeyRepository } from "../../workflows/extensionKeyRepository.js";
import { createHadesService } from "../../services/hades.service.js";

function createFakeSupabaseClient() {
  const rows = [];
  return {
    rows,
    from() {
      return {
        upsert(obj) {
          const idx = rows.findIndex((r) => r.id === obj.id);
          if (idx >= 0) rows[idx] = { ...rows[idx], ...obj };
          else rows.push({ ...obj });
          return Promise.resolve({ data: obj, error: null });
        },
        insert(obj) {
          rows.push({ ...obj });
          return Promise.resolve({ data: obj, error: null });
        },
        select() {
          return Promise.resolve({ data: [...rows], error: null });
        },
        delete() {
          return {
            eq(col, val) {
              for (let i = rows.length - 1; i >= 0; i--) {
                if (rows[i][col] === val) rows.splice(i, 1);
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };
}

const USER = { userId: "u1", tenantId: "t1" };
const OTHER_USER = { userId: "u2", tenantId: "t2" };

// ─── Document Repository ────────────────────────────────────────

test("documentRepository — create stores a document record", async () => {
  const repo = createDocumentRepository({ storage: "memory" });
  const doc = await repo.create({
    ...USER,
    name: "test.txt",
    contentType: "text/plain",
    size: 100,
    storageKey: "uploads/test.txt",
    textContent: "Hello world",
  });

  assert.ok(doc.id, "has id");
  assert.equal(doc.user_id, "u1");
  assert.equal(doc.name, "test.txt");
  assert.equal(doc.text_content, "Hello world");
});

test("documentRepository — listByUser returns documents for matching user", async () => {
  const repo = createDocumentRepository({ storage: "memory" });
  await repo.create({ ...USER, name: "doc1.txt", contentType: "text/plain", size: 10, storageKey: "k1" });
  await repo.create({ ...USER, name: "doc2.txt", contentType: "text/plain", size: 20, storageKey: "k2" });
  await repo.create({ ...OTHER_USER, name: "other.txt", contentType: "text/plain", size: 30, storageKey: "k3" });

  const docs = await repo.listByUser(USER);
  assert.equal(docs.length, 2);
  assert.equal(docs[0].name, "doc1.txt");
  assert.equal(docs[1].name, "doc2.txt");
});

test("documentRepository — listByUser returns empty array when no docs", async () => {
  const repo = createDocumentRepository({ storage: "memory" });
  const docs = await repo.listByUser(USER);
  assert.deepEqual(docs, []);
});

test("documentRepository — delete removes a document by id", async () => {
  const repo = createDocumentRepository({ storage: "memory" });
  const doc = await repo.create({ ...USER, name: "test.txt", contentType: "text/plain", size: 10, storageKey: "k1" });
  const deleted = await repo.delete({ id: doc.id, userId: USER.userId, tenantId: USER.tenantId });
  assert.ok(deleted);
  const docs = await repo.listByUser(USER);
  assert.equal(docs.length, 0);
});

test("documentRepository — supabase mode persists and hydrates", async () => {
  const supabase = createFakeSupabaseClient();
  const repo = createDocumentRepository({ storage: "supabase", supabaseClient: supabase });
  await repo.create({ ...USER, name: "persisted.txt", contentType: "text/plain", size: 50, storageKey: "k1" });

  const repo2 = createDocumentRepository({ storage: "supabase", supabaseClient: supabase });
  const docs = await repo2.listByUser(USER);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].name, "persisted.txt");
});

// ─── Context Space Repository ──────────────────────────────────

test("contextSpaceRepository — createOrUpdate creates a new space", async () => {
  const repo = createContextSpaceRepository({ storage: "memory" });
  const space = await repo.createOrUpdate({
    ...USER,
    name: "My Notes",
    content: "Some important context",
  });

  assert.ok(space.id, "has id");
  assert.equal(space.name, "My Notes");
  assert.equal(space.content, "Some important context");
});

test("contextSpaceRepository — createOrUpdate updates existing space by name", async () => {
  const repo = createContextSpaceRepository({ storage: "memory" });
  await repo.createOrUpdate({ ...USER, name: "Notes", content: "v1" });
  const updated = await repo.createOrUpdate({ ...USER, name: "Notes", content: "v2" });

  assert.equal(updated.content, "v2");
});

test("contextSpaceRepository — listByUser returns user's spaces", async () => {
  const repo = createContextSpaceRepository({ storage: "memory" });
  await repo.createOrUpdate({ ...USER, name: "A", content: "a" });
  await repo.createOrUpdate({ ...USER, name: "B", content: "b" });
  await repo.createOrUpdate({ ...OTHER_USER, name: "C", content: "c" });

  const spaces = await repo.listByUser(USER);
  assert.equal(spaces.length, 2);
});

test("contextSpaceRepository — delete removes a space by id", async () => {
  const repo = createContextSpaceRepository({ storage: "memory" });
  const space = await repo.createOrUpdate({ ...USER, name: "Temp", content: "temp" });
  await repo.delete({ id: space.id, userId: USER.userId, tenantId: USER.tenantId });
  const spaces = await repo.listByUser(USER);
  assert.equal(spaces.length, 0);
});

// ─── Page Capture Repository ───────────────────────────────────

test("pageCaptureRepository — create stores a page capture", async () => {
  const repo = createPageCaptureRepository({ storage: "memory" });
  const capture = await repo.create({
    ...USER,
    url: "https://example.com",
    title: "Example",
    selectedText: "some text",
    fullText: "full page text content here",
  });

  assert.ok(capture.id, "has id");
  assert.equal(capture.url, "https://example.com");
  assert.equal(capture.title, "Example");
  assert.equal(capture.selected_text, "some text");
  assert.equal(capture.full_text, "full page text content here");
});

test("pageCaptureRepository — listByUser returns user's captures", async () => {
  const repo = createPageCaptureRepository({ storage: "memory" });
  await repo.create({ ...USER, url: "https://a.com", title: "A", fullText: "a" });
  await repo.create({ ...OTHER_USER, url: "https://b.com", title: "B", fullText: "b" });

  const captures = await repo.listByUser(USER);
  assert.equal(captures.length, 1);
  assert.equal(captures[0].url, "https://a.com");
});

test("pageCaptureRepository — listByUser returns empty when no captures", async () => {
  const repo = createPageCaptureRepository({ storage: "memory" });
  const captures = await repo.listByUser(USER);
  assert.deepEqual(captures, []);
});

test("pageCaptureRepository — delete removes a capture by id", async () => {
  const repo = createPageCaptureRepository({ storage: "memory" });
  const capture = await repo.create({ ...USER, url: "https://x.com", title: "X", fullText: "x" });
  await repo.delete({ id: capture.id, userId: USER.userId, tenantId: USER.tenantId });
  const captures = await repo.listByUser(USER);
  assert.equal(captures.length, 0);
});

// ─── Approval Repository ───────────────────────────────────────

test("approvalRepository — create stores a pending approval", async () => {
  const repo = createApprovalRepository({ storage: "memory" });
  const approval = await repo.create({
    ...USER,
    actionType: "document:submit",
    description: "Submit document to HR",
    payload: { docId: "123" },
  });

  assert.ok(approval.id, "has id");
  assert.equal(approval.action_type, "document:submit");
  assert.equal(approval.status, "pending");
  assert.deepEqual(approval.payload, { docId: "123" });
});

test("approvalRepository — listPending returns only pending approvals for user", async () => {
  const repo = createApprovalRepository({ storage: "memory" });
  await repo.create({ ...USER, actionType: "type1", description: "d1", payload: {} });
  await repo.create({ ...USER, actionType: "type2", description: "d2", payload: {} });
  // Create one for other user
  await repo.create({ ...OTHER_USER, actionType: "type3", description: "d3", payload: {} });

  const pending = await repo.listPending(USER);
  assert.equal(pending.length, 2);
});

test("approvalRepository — decide updates status to approved", async () => {
  const repo = createApprovalRepository({ storage: "memory" });
  const approval = await repo.create({ ...USER, actionType: "test", description: "test", payload: {} });

  const decided = await repo.decide({ id: approval.id, userId: USER.userId, tenantId: USER.tenantId, status: "approved" });
  assert.equal(decided.status, "approved");

  const pending = await repo.listPending(USER);
  assert.equal(pending.length, 0);
});

test("approvalRepository — decide updates status to rejected", async () => {
  const repo = createApprovalRepository({ storage: "memory" });
  const approval = await repo.create({ ...USER, actionType: "test", description: "test", payload: {} });

  const decided = await repo.decide({ id: approval.id, userId: USER.userId, tenantId: USER.tenantId, status: "rejected" });
  assert.equal(decided.status, "rejected");
});

test("approvalRepository — decide returns null for non-existent approval", async () => {
  const repo = createApprovalRepository({ storage: "memory" });
  const result = await repo.decide({ id: "nonexistent", userId: USER.userId, tenantId: USER.tenantId, status: "approved" });
  assert.equal(result, null);
});

// ─── Service: listExtensionWorkflows ───────────────────────────

test("listExtensionWorkflows — returns workflows from workflowDefinitions repo", async () => {
  const mockScopedRepos = {
    workflowDefinitions: {
      listDefinitions: async ({ userId, tenantId }) => {
        assert.equal(userId, "ext-u1");
        assert.equal(tenantId, "ext-t1");
        return [{ id: "wf1", name: "Test Workflow", goal: "test", prompt: "do it" }];
      },
    },
  };

  const { createHadesService } = await import("../../services/hades.service.js");
  const service = createHadesService({
    repository: {},
    scopedRepos: mockScopedRepos,
    hermes: {},
    config: {},
    context: {},
  });

  const result = await service.listExtensionWorkflows({ userId: "ext-u1", tenantId: "ext-t1" });
  assert.ok(result.workflows);
  assert.equal(result.workflows.length, 1);
  assert.equal(result.workflows[0].name, "Test Workflow");
});

// ─── Extension Routes with extension auth ─────────────────────

import { createHadesRoutes } from "../../routes/hades.routes.js";
import express from "express";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

function createMockKeyRepo() {
  return {
    verifyKey: async ({ plaintextKey, requiredScope }) => {
      if (plaintextKey === "valid-key") {
        return { id: "key1", scopes: [requiredScope], userId: "ext-u1", tenantId: "ext-t1" };
      }
      return null;
    },
  };
}

function createTestApp(serviceOverrides = {}) {
  const app = express();
  app.use(express.json());

  const scopedRepos = { extensionKeys: createMockKeyRepo() };
  const service = {
    listExtensionWorkflows: async (auth) => ({ workflows: [{ id: "wf1", name: "Test" }] }),
    extensionChat: async (body, auth) => ({ reply: "Hello from extension", conversationId: "c1" }),
    listExtensionMinions: async (auth) => ({ minions: [] }),
    saveExtensionMinion: async (body, auth) => ({ minion: { id: "m1", name: body.name } }),
    ...serviceOverrides,
  };

  const router = createHadesRoutes({ service, scopedRepos, config: {} });
  app.use("/api/hades", router);
  return app;
}

test("GET /api/hades/extension/workflows returns workflow list with extension auth", async () => {
  const app = createTestApp();
  const res = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/extension/workflows",
    headers: { authorization: "Bearer valid-key" },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.ok(body.workflows);
});

test("GET /api/hades/extension/workflows rejects request without extension key", async () => {
  const app = createTestApp();
  const res = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/extension/workflows",
  });

  assert.equal(res.status, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.code, "missing_extension_key");
});

test("GET /api/hades/extension/workflows rejects invalid extension key", async () => {
  const app = createTestApp();
  const res = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/extension/workflows",
    headers: { authorization: "Bearer invalid-key" },
  });

  assert.equal(res.status, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.code, "invalid_extension_key");
});

test("POST /api/hades/extension/chat returns response with extension auth", async () => {
  const app = createTestApp();
  const res = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/extension/chat",
    headers: { authorization: "Bearer valid-key" },
    body: { message: "Hello" },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.ok(body.reply);
});

test("GET /api/hades/extension/minions returns list with extension auth", async () => {
  const app = createTestApp();
  const res = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/extension/minions",
    headers: { authorization: "Bearer valid-key" },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.ok(Array.isArray(body.minions));
});

test("POST /api/hades/extension/minions creates minion with extension auth", async () => {
  const app = createTestApp();
  const res = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/extension/minions",
    headers: { authorization: "Bearer valid-key" },
    body: { name: "Test Minion", goal: "test" },
  });

  assert.equal(res.status, 201);
  const body = JSON.parse(res.body);
  assert.equal(body.minion.name, "Test Minion");
});

// ─── Extension key verifyKey wildcard scope ─────────────────────

test("verifyKey with scopes [\"*\"] matches workflow:read scope", async () => {
  const repo = createExtensionKeyRepository({ storage: "memory" });
  const { plaintextKey } = await repo.createKey({
    userId: "u1", tenantId: "t1",
    data: { name: "Wildcard Key", scopes: ["*"] },
  });

  const auth = await repo.verifyKey({ plaintextKey, requiredScope: "workflow:read" });
  assert.ok(auth, "verifyKey should return auth context for wildcard scope");
  assert.equal(auth.userId, "u1");

  const auth2 = await repo.verifyKey({ plaintextKey, requiredScope: "document:upload" });
  assert.ok(auth2, "verifyKey should match wildcard against any scope");

  const { plaintextKey: narrowKey } = await repo.createKey({
    userId: "u1", tenantId: "t1",
    data: { name: "Narrow Key", scopes: ["chat:send"] },
  });
  const auth3 = await repo.verifyKey({ plaintextKey: narrowKey, requiredScope: "workflow:read" });
  assert.equal(auth3, null, "verifyKey should reject scope not in key's scopes");
});

// ─── listExtensionPageCaptures ──────────────────────────────────

test("listExtensionPageCaptures returns pageCaptures from the repository", async () => {
  const captures = [];
  const mockScopedRepos = {
    extensionPageCaptures: {
      listByUser: async ({ userId, tenantId }) => {
        return captures.filter(c => c.user_id === userId && c.tenant_id === tenantId);
      },
    },
  };

  const service = createHadesService({
    repository: {},
    scopedRepos: mockScopedRepos,
    hermes: {},
    config: {},
    context: {},
  });

  const empty = await service.listExtensionPageCaptures({ userId: "u1", tenantId: "t1" });
  assert.ok(Array.isArray(empty.pageCaptures));
  assert.equal(empty.pageCaptures.length, 0);
});

test("listExtensionPageCaptures returns empty array when repo is not configured", async () => {
  const service = createHadesService({
    repository: {},
    scopedRepos: {},
    hermes: {},
    config: {},
    context: {},
  });

  const result = await service.listExtensionPageCaptures({ userId: "u1", tenantId: "t1" });
  assert.ok(Array.isArray(result.pageCaptures));
  assert.equal(result.pageCaptures.length, 0);
});

// ─── GET /extension/page-capture route ─────────────────────────

test("GET /api/hades/extension/page-capture returns page captures with extension auth", async () => {
  const app = createTestApp({
    listExtensionPageCaptures: async (auth) => {
      assert.equal(auth.userId, "ext-u1");
      return { pageCaptures: [{ id: "pc1", url: "https://example.com", title: "Example" }] };
    },
  });
  const res = await invokeApp(app, {
    method: "GET",
    path: "/api/hades/extension/page-capture",
    headers: { authorization: "Bearer valid-key" },
  });

  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.ok(Array.isArray(body.pageCaptures));
  assert.equal(body.pageCaptures.length, 1);
  assert.equal(body.pageCaptures[0].url, "https://example.com");
});

// ─── saveExtensionApproval (POST /extension/approvals) ─────────

test("saveExtensionApproval creates an approval via the repository", async () => {
  const mockScopedRepos = {
    extensionApprovals: {
      create: async ({ userId, tenantId, actionType, description, payload }) => {
        assert.equal(userId, "u1");
        assert.equal(tenantId, "t1");
        assert.equal(actionType, "document:sign");
        assert.equal(description, "Sign the document");
        assert.deepEqual(payload, { docId: "123" });
        return { id: "ap1", action_type: actionType, status: "pending", payload };
      },
    },
  };

  const service = createHadesService({
    repository: {},
    scopedRepos: mockScopedRepos,
    hermes: {},
    config: {},
    context: {},
  });

  const result = await service.saveExtensionApproval(
    { action: "document:sign", description: "Sign the document", metadata: { docId: "123" } },
    { userId: "u1", tenantId: "t1" }
  );

  assert.ok(result.approval);
  assert.equal(result.approval.action_type, "document:sign");
  assert.equal(result.approval.status, "pending");
});

test("saveExtensionApproval throws 501 when repo is not configured", async () => {
  const service = createHadesService({
    repository: {},
    scopedRepos: {},
    hermes: {},
    config: {},
    context: {},
  });

  try {
    await service.saveExtensionApproval({ action: "test" }, { userId: "u1", tenantId: "t1" });
    assert.fail("should have thrown");
  } catch (err) {
    assert.equal(err.status, 501);
    assert.ok(err.message.includes("not configured"));
  }
});

// ─── POST /extension/approvals route ───────────────────────────

test("POST /api/hades/extension/approvals creates approval with extension auth", async () => {
  const app = createTestApp({
    saveExtensionApproval: async (body, auth) => {
      assert.equal(auth.userId, "ext-u1");
      assert.equal(body.action, "document:submit");
      return { approval: { id: "ap1", action_type: "document:submit", status: "pending" } };
    },
  });
  const res = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/extension/approvals",
    headers: { authorization: "Bearer valid-key" },
    body: { action: "document:submit", description: "Submit doc", metadata: { docId: "456" } },
  });

  assert.equal(res.status, 201);
  const body = JSON.parse(res.body);
  assert.ok(body.approval);
  assert.equal(body.approval.action_type, "document:submit");
});
