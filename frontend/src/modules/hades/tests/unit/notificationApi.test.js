import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("notification API functions", () => {
  test("getNotifications is exported as a function", async () => {
    const mod = await import("../../hadesApi.js");
    assert.equal(typeof mod.getNotifications, "function");
  });

  test("getNotifications fetches notification list", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url) => {
      assert.ok(url.endsWith("/api/hades/notifications"));
      return {
        ok: true,
        async text() {
          return JSON.stringify([
            { id: "n1", title: "Test", message: "Hello", read: false },
            { id: "n2", title: "Alert", message: "Warning", read: true },
          ]);
        },
      };
    };

    const mod = await import("../../hadesApi.js");
    const result = await mod.getNotifications();
    assert.equal(result.length, 2);
    assert.equal(result[0].title, "Test");
  });

  test("markNotificationRead is exported as a function", async () => {
    const mod = await import("../../hadesApi.js");
    assert.equal(typeof mod.markNotificationRead, "function");
  });

  test("markNotificationRead sends PATCH to mark a single notification as read", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/hades/notifications/n1/read"));
      assert.equal(options.method, "PATCH");
      return {
        ok: true,
        async text() {
          return JSON.stringify({ id: "n1", read: true });
        },
      };
    };

    const mod = await import("../../hadesApi.js");
    const result = await mod.markNotificationRead("n1");
    assert.equal(result.read, true);
  });

  test("markAllNotificationsRead is exported as a function", async () => {
    const mod = await import("../../hadesApi.js");
    assert.equal(typeof mod.markAllNotificationsRead, "function");
  });

  test("markAllNotificationsRead sends PATCH to mark all as read", async () => {
    globalThis.importMetaEnvShim = { VITE_API_BASE_URL: "" };
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/hades/notifications/read-all"));
      assert.equal(options.method, "PATCH");
      return {
        ok: true,
        async text() {
          return JSON.stringify({ success: true });
        },
      };
    };

    const mod = await import("../../hadesApi.js");
    const result = await mod.markAllNotificationsRead();
    assert.equal(result.success, true);
  });
});
