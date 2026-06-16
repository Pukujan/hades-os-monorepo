import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("hadesViewModel", () => {
  // --- RED: these test desired API-driven behavior that doesn't exist yet ---

  test("buildMinionDetailViewModel accepts data source option", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    assert.equal(
      mod.buildMinionDetailViewModel.length >= 2,
      true,
      "expected buildMinionDetailViewModel(minionId, options) with >= 2 params"
    );
  });

  test("buildMinionDetailViewModel returns async result when options.getMinion is provided", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    const getMinion = async (id) => ({ id, name: "API Minion", status: "active" });
    const result = mod.buildMinionDetailViewModel("m1", { getMinion });
    assert.equal(typeof result?.then, "function", "expected async result with options.getMinion");
    const data = await result;
    assert.equal(data.name, "API Minion");
  });

  test("buildMinionDetailViewModel returns null for non-existent minion via API", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    const getMinion = async () => null;
    const result = await mod.buildMinionDetailViewModel("non_existent", { getMinion });
    assert.equal(result, null);
  });

  test("buildMinionScreenViewModel accepts data source option", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    assert.equal(
      mod.buildMinionScreenViewModel.length >= 1,
      true,
      "expected buildMinionScreenViewModel(options) with >= 1 param"
    );
  });

  test("buildMinionScreenViewModel returns async result when options.listMinions is provided", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    const listMinions = async () => [
      { id: "m1", name: "M1", status: "active" },
    ];
    const result = mod.buildMinionScreenViewModel({ listMinions });
    assert.equal(typeof result?.then, "function", "expected async result with options.listMinions");
    const data = await result;
    assert.ok(Array.isArray(data.minions));
    assert.equal(data.minions.length, 1);
  });

  test("buildNotificationViewModel accepts data source option", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    assert.equal(
      mod.buildNotificationViewModel.length >= 1,
      true,
      "expected buildNotificationViewModel(options) with >= 1 param"
    );
  });

  test("buildNotificationViewModel returns async result when options.listNotifications is provided", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    const listNotifications = async () => [
      { id: "n1", title: "Test", message: "Hello", read: false },
    ];
    const result = mod.buildNotificationViewModel({ listNotifications });
    assert.equal(typeof result?.then, "function");
    const data = await result;
    assert.ok(Array.isArray(data.notifications));
    assert.equal(data.notifications.length, 1);
  });

  // --- GREEN: these test existing mock-based behavior (baseline contract) ---

  test("buildMinionDetailViewModel is exported as a function", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    assert.equal(typeof mod.buildMinionDetailViewModel, "function");
  });

  test("buildMinionScreenViewModel is exported as a function", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    assert.equal(typeof mod.buildMinionScreenViewModel, "function");
  });

  test("buildNotificationViewModel is exported as a function", async () => {
    const mod = await import("../../utils/hadesViewModel.js");
    assert.equal(typeof mod.buildNotificationViewModel, "function");
  });
});
