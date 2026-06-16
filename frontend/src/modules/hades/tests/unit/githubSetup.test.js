import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildGitHubOAuthUrl, formatGitHubAppName, buildGitHubSetupCommand } from "../../services/githubSetup.js";

describe("buildGitHubOAuthUrl", () => {
  test("creates GitHub OAuth URL with default params", () => {
    const url = buildGitHubOAuthUrl();
    assert.ok(url.startsWith("https://github.com/login/oauth/authorize"));
    assert.ok(url.includes("client_id="));
    assert.ok(url.includes("scope=repo"));
  });

  test("accepts custom client ID", () => {
    const url = buildGitHubOAuthUrl("github_client_123");
    assert.ok(url.includes("client_id=github_client_123"));
  });

  test("accepts custom scope", () => {
    const url = buildGitHubOAuthUrl("client-id", "repo,read:org");
    assert.ok(url.includes("scope=repo,read:org"));
  });

  test("returns a valid URL string", () => {
    const url = buildGitHubOAuthUrl("test-client");
    assert.doesNotThrow(() => new URL(url));
  });
});

describe("formatGitHubAppName", () => {
  test("returns app name when provided", () => {
    assert.equal(formatGitHubAppName("MyApp"), "MyApp");
  });

  test("returns fallback when name is null", () => {
    assert.equal(formatGitHubAppName(null), "GitHub App");
  });

  test("returns fallback when name is undefined", () => {
    assert.equal(formatGitHubAppName(undefined), "GitHub App");
  });

  test("returns fallback when name is empty", () => {
    assert.equal(formatGitHubAppName(""), "GitHub App");
  });
});

describe("buildGitHubSetupCommand", () => {
  test("returns command with username when provided", () => {
    const cmd = buildGitHubSetupCommand("alice");
    assert.ok(cmd.includes("alice"));
    assert.ok(cmd.includes("hades-github-app"));
  });

  test("uses default username when missing", () => {
    const cmd = buildGitHubSetupCommand(null);
    assert.ok(cmd.includes("hades-github-app"));
    assert.ok(cmd.length > 0);
  });
});
