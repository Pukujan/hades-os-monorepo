import { test } from "node:test";
import assert from "node:assert/strict";

function makeLocation(overrides = {}) {
  return {
    origin: "https://hades.example.com",
    pathname: "/login",
    search: "",
    hash: "",
    ...overrides
  };
}

test("getAfterLoginUrl returns /app by default", async () => {
  const { getAfterLoginUrl } = await import("./authRedirects.js");
  assert.equal(getAfterLoginUrl(makeLocation()), "/app");
});

test("getAfterLoginUrl keeps existing /app path", async () => {
  const { getAfterLoginUrl } = await import("./authRedirects.js");
  assert.equal(getAfterLoginUrl(makeLocation({ pathname: "/app" })), "/app");
});

test("getAfterLoginUrl preserves redirect query param", async () => {
  const { getAfterLoginUrl } = await import("./authRedirects.js");
  assert.equal(
    getAfterLoginUrl(makeLocation({ pathname: "/login", search: "?redirect=/app/settings" })),
    "/app/settings"
  );
});

test("getAfterLoginUrl falls back to /app for unknown paths", async () => {
  const { getAfterLoginUrl } = await import("./authRedirects.js");
  assert.equal(getAfterLoginUrl(makeLocation({ pathname: "/some/unknown/path" })), "/app");
});

test("getAfterLoginUrl returns /app when no location", async () => {
  const { getAfterLoginUrl } = await import("./authRedirects.js");
  assert.equal(getAfterLoginUrl(null), "/app");
});

test("buildOAuthRedirectTo builds full redirect URL", async () => {
  const { buildOAuthRedirectTo, getAfterLoginUrl } = await import("./authRedirects.js");
  const loc = makeLocation();
  const result = buildOAuthRedirectTo(loc);
  assert.equal(result, "https://hades.example.com/app");
});

test("buildOAuthRedirectTo uses custom redirect param", async () => {
  const { buildOAuthRedirectTo } = await import("./authRedirects.js");
  const loc = makeLocation({ pathname: "/login", search: "?redirect=/app/settings" });
  assert.equal(buildOAuthRedirectTo(loc), "https://hades.example.com/app/settings");
});
