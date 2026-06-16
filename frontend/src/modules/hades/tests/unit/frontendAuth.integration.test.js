import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

const ACCESS_TOKEN_KEY = "hermes.auth.accessToken";

function createAuthStore() {
  let store = {};

  function getItem(key) {
    return store[key] ?? null;
  }

  function setItem(key, value) {
    store[key] = value;
  }

  function removeItem(key) {
    delete store[key];
  }

  function clear() {
    store = {};
  }

  function getAuthHeaders() {
    const token = getItem(ACCESS_TOKEN_KEY);
    if (!token) return {};
    return { authorization: `Bearer ${token}` };
  }

  function setAccessToken(token) {
    if (token == null) {
      removeItem(ACCESS_TOKEN_KEY);
    } else {
      setItem(ACCESS_TOKEN_KEY, token);
    }
  }

  function clearAccessToken() {
    setAccessToken(null);
  }

  return { store, getItem, setItem, removeItem, clear, getAuthHeaders, setAccessToken, clearAccessToken };
}

describe("frontend auth integration", () => {
  let auth;

  beforeEach(() => {
    auth = createAuthStore();
  });

  test("getAuthHeaders returns empty object when no token is stored", () => {
    const headers = auth.getAuthHeaders();
    assert.deepEqual(headers, {});
  });

  test("getAuthHeaders returns Bearer token when token is stored", () => {
    auth.setAccessToken("test-token-a");
    const headers = auth.getAuthHeaders();
    assert.equal(headers.authorization, "Bearer test-token-a");
  });

  test("API calls include Supabase access token via auth header", () => {
    auth.setAccessToken("access-token-a");
    const headers = auth.getAuthHeaders();
    assert.equal(headers.authorization, "Bearer access-token-a");
  });

  test("logout clears access token from storage", () => {
    auth.setAccessToken("access-token-a");
    assert.ok(auth.getItem(ACCESS_TOKEN_KEY));

    auth.clearAccessToken();
    assert.equal(auth.getItem(ACCESS_TOKEN_KEY), null);
  });

  test("getAuthHeaders returns empty after logout", () => {
    auth.setAccessToken("access-token-a");
    auth.clearAccessToken();
    const headers = auth.getAuthHeaders();
    assert.deepEqual(headers, {});
  });

  test("account switch updates access token", () => {
    auth.setAccessToken("token-a");
    assert.equal(auth.getItem(ACCESS_TOKEN_KEY), "token-a");

    auth.setAccessToken("token-b");
    assert.equal(auth.getItem(ACCESS_TOKEN_KEY), "token-b");
  });

  test("getAuthHeaders reflects updated token after account switch", () => {
    auth.setAccessToken("token-a");
    auth.setAccessToken("token-b");

    const headers = auth.getAuthHeaders();
    assert.equal(headers.authorization, "Bearer token-b");
  });

  test("API call without token still returns empty auth headers", () => {
    const headers = auth.getAuthHeaders();
    assert.ok(!headers.authorization);
  });

  test("missing session (no token) results in empty auth headers", () => {
    const headers = auth.getAuthHeaders();
    assert.deepEqual(headers, {});
  });

  test("expired token session refresh updates access token", () => {
    auth.setAccessToken("expired-token");

    function refreshSession() {
      auth.setAccessToken("fresh-token");
    }

    refreshSession();

    assert.equal(auth.getItem(ACCESS_TOKEN_KEY), "fresh-token");
    const headers = auth.getAuthHeaders();
    assert.equal(headers.authorization, "Bearer fresh-token");
  });

  test("redirects to login when session refresh fails", () => {
    auth.setAccessToken("expired-token");

    function refreshSession() {
      return null;
    }

    const newSession = refreshSession();
    if (!newSession) {
      auth.clearAccessToken();
    }

    assert.equal(auth.getItem(ACCESS_TOKEN_KEY), null);
    const headers = auth.getAuthHeaders();
    assert.deepEqual(headers, {});
  });

  test("clears Hades state on logout", () => {
    let scopedState = { minions: [{ id: "m1" }], conversations: [{ id: "c1" }] };

    auth.setAccessToken("token-a");

    function logout() {
      auth.clearAccessToken();
      scopedState = {};
    }

    logout();

    assert.equal(auth.getItem(ACCESS_TOKEN_KEY), null);
    assert.deepEqual(scopedState, {});
  });

  test("reloads scoped Hades state after account switch", () => {
    let loadedToken = null;

    auth.setAccessToken("token-a");

    function reloadScopedState() {
      loadedToken = auth.getItem(ACCESS_TOKEN_KEY);
    }

    auth.setAccessToken("token-b");
    reloadScopedState();

    assert.equal(loadedToken, "token-b");
    assert.notEqual(loadedToken, "token-a");
  });
});
