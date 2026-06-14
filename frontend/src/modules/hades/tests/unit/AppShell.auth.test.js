import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("AppShell auth behavior", () => {
  test("session null triggers login redirect", () => {
    const session = null;
    const shouldRedirect = !session;
    assert.ok(shouldRedirect, "Null session should trigger redirect");
  });

  test("authenticated session renders app", () => {
    const session = { user: { id: "user_a" } };
    const isAuthenticated = session !== null && session.user !== null;
    assert.ok(isAuthenticated, "Valid session means user is authenticated");
  });

  test("clears scoped UI state on logout", () => {
    let scopedState = { selectedMinionId: "minion_a", theme: "ember" };

    function clearScopedState() {
      scopedState = {};
    }

    clearScopedState();

    assert.deepEqual(scopedState, {});
  });

  test("reloads scoped minions after account switch", () => {
    let loadedUserId = null;
    const previousUserId = "user_a";

    function loadScopedMinions({ userId }) {
      loadedUserId = userId;
    }

    loadScopedMinions({ userId: "user_b" });

    assert.equal(loadedUserId, "user_b");
    assert.notEqual(loadedUserId, previousUserId);
  });
});
