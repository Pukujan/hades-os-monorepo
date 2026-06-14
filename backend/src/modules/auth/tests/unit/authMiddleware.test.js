import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../services/authMiddleware.js");
  } catch (error) {
    throw new Error(
      "Missing authMiddleware.js — expected at ../../services/authMiddleware.js",
      { cause: error }
    );
  }
}

describe("requireHadesAuth", () => {
  let supabaseAuth;

  beforeEach(() => {
    supabaseAuth = {
      getUserFromToken: async () => null,
    };
  });

  test("rejects request with no session token", async () => {
    const { requireHadesAuth } = await loadModule();
    const req = { headers: {} };

    await assert.rejects(
      () => requireHadesAuth(req, { supabaseAuth }),
      { code: "missing_auth" }
    );
  });

  test("rejects request with invalid session token", async () => {
    const { requireHadesAuth } = await loadModule();
    const req = { headers: { authorization: "Bearer bad-token" } };

    await assert.rejects(
      () => requireHadesAuth(req, { supabaseAuth }),
      { code: "invalid_auth" }
    );
  });

  test("accepts request with valid Supabase session", async () => {
    const { requireHadesAuth } = await loadModule();
    const req = { headers: { authorization: "Bearer valid-token" } };

    supabaseAuth.getUserFromToken = async () => ({
      id: "user_a",
      app_metadata: { tenant_id: "tenant_a" },
    });

    const result = await requireHadesAuth(req, { supabaseAuth });

    assert.equal(result.userId, "user_a");
    assert.equal(result.tenantId, "tenant_a");
    assert.equal(result.sessionToken, "valid-token");
  });

  test("defaults tenantId to userId when tenant_id is missing", async () => {
    const { requireHadesAuth } = await loadModule();
    const req = { headers: { authorization: "Bearer valid-token" } };

    supabaseAuth.getUserFromToken = async () => ({
      id: "user_a",
      app_metadata: {},
    });

    const result = await requireHadesAuth(req, { supabaseAuth });

    assert.equal(result.tenantId, "user_a");
  });

  test("does not allow client-provided userId to override session userId", async () => {
    const { requireHadesAuth } = await loadModule();
    const req = {
      headers: { authorization: "Bearer valid-token" },
      body: { user_id: "user_b", tenant_id: "tenant_b" },
    };

    supabaseAuth.getUserFromToken = async () => ({
      id: "user_a",
      app_metadata: { tenant_id: "tenant_a" },
    });

    const result = await requireHadesAuth(req, { supabaseAuth });

    assert.equal(result.userId, "user_a");
    assert.equal(result.tenantId, "tenant_a");
  });
});
