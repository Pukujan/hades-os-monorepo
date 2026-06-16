import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import React from "react";

import { GitHubSetupCard } from "../../components/GitHubSetupCard.jsx";

describe("GitHubSetupCard rendering", () => {
  test("renders connect interface when disconnected", () => {
    const html = renderToString(
      React.createElement(GitHubSetupCard, {
        connection: { status: "disconnected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('data-testid="github-card"'));
    assert.ok(html.includes("GitHub"));
    assert.ok(html.includes("Not connected"));
  });

  test("renders connected state with username", () => {
    const html = renderToString(
      React.createElement(GitHubSetupCard, {
        connection: {
          status: "connected",
          username: "hades-operator",
          scope: "repo"
        },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('data-testid="github-card"'));
    assert.ok(html.includes("hades-operator"));
  });

  test("renders token input in disconnected state", () => {
    const html = renderToString(
      React.createElement(GitHubSetupCard, {
        connection: { status: "disconnected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('aria-label="GitHub personal access token"'));
    assert.ok(html.includes('data-testid="github-actions"'));
  });

  test("connected state has no token input", () => {
    const html = renderToString(
      React.createElement(GitHubSetupCard, {
        connection: { status: "connected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(!html.includes('aria-label="GitHub personal access token"'));
  });

  test("renders help button linking to GitHub token settings in disconnected state", () => {
    const html = renderToString(
      React.createElement(GitHubSetupCard, {
        connection: { status: "disconnected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes("Open GitHub token settings"));
  });

  test("connected state does not show help button", () => {
    const html = renderToString(
      React.createElement(GitHubSetupCard, {
        connection: { status: "connected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(!html.includes("Open GitHub token settings"));
  });
});
