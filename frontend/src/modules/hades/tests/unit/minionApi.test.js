import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("minion API functions", () => {
  test("getMinion is exported as a function", async () => {
    const mod = await import("../../services/hadesApi.js");
    assert.equal(typeof mod.getMinion, "function");
  });

  test("getMinion fetches a single minion by id", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url) => {
      assert.ok(url.endsWith("/api/hades/minions/m1"), `unexpected URL: ${url}`);
      return {
        ok: true,
        async text() {
          return JSON.stringify({ id: "m1", name: "Test Minion", status: "active" });
        },
      };
    };

    const mod = await import("../../services/hadesApi.js");
    const minion = await mod.getMinion("m1");
    assert.equal(minion.id, "m1");
    assert.equal(minion.name, "Test Minion");
    assert.equal(minion.status, "active");
  });

  test("listMinions is exported as a function", async () => {
    const mod = await import("../../services/hadesApi.js");
    assert.equal(typeof mod.listMinions, "function");
  });

  test("listMinions fetches all minions", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url) => {
      assert.ok(url.endsWith("/api/hades/minions"));
      return {
        ok: true,
        async text() {
          return JSON.stringify([
            { id: "m1", name: "Minion 1", status: "active" },
            { id: "m2", name: "Minion 2", status: "idle" },
          ]);
        },
      };
    };

    const mod = await import("../../services/hadesApi.js");
    const minions = await mod.listMinions();
    assert.equal(minions.length, 2);
    assert.equal(minions[0].id, "m1");
  });

  test("getMinionLogs is exported as a function", async () => {
    const mod = await import("../../services/hadesApi.js");
    assert.equal(typeof mod.getMinionLogs, "function");
  });

  test("getMinionLogs fetches logs for a minion", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url) => {
      assert.ok(url.endsWith("/api/hades/minions/m1/logs"));
      return {
        ok: true,
        async text() {
          return JSON.stringify([
            { id: "l1", summary: "Log entry 1", level: "info" },
            { id: "l2", summary: "Log entry 2", level: "warn" },
          ]);
        },
      };
    };

    const mod = await import("../../services/hadesApi.js");
    const logs = await mod.getMinionLogs("m1");
    assert.equal(logs.length, 2);
    assert.equal(logs[0].summary, "Log entry 1");
  });

  test("updateMinion is exported as a function", async () => {
    const mod = await import("../../services/hadesApi.js");
    assert.equal(typeof mod.updateMinion, "function");
  });

  test("updateMinion sends PATCH with updated fields", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/hades/minions/m1"));
      assert.equal(options.method, "PATCH");
      const body = JSON.parse(options.body);
      assert.equal(body.name, "Updated Minion");
      return {
        ok: true,
        async text() {
          return JSON.stringify({ id: "m1", name: "Updated Minion" });
        },
      };
    };

    const mod = await import("../../services/hadesApi.js");
    const result = await mod.updateMinion("m1", { name: "Updated Minion" });
    assert.equal(result.name, "Updated Minion");
  });

  test("deleteMinion is exported as a function", async () => {
    const mod = await import("../../services/hadesApi.js");
    assert.equal(typeof mod.deleteMinion, "function");
  });

  test("deleteMinion sends DELETE request", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/hades/minions/m1"));
      assert.equal(options.method, "DELETE");
      return {
        ok: true,
        async text() {
          return JSON.stringify({ deleted: true });
        },
      };
    };

    const mod = await import("../../services/hadesApi.js");
    const result = await mod.deleteMinion("m1");
    assert.equal(result.deleted, true);
  });
});
