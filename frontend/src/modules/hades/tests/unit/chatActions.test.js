import { test } from "node:test";
import assert from "node:assert/strict";

test("extractLinkActionsFromText extracts http URLs from text", async () => {
  const mod = await import("../../chatActions.js");
  const text = "Check out https://example.com/cat and http://foo.bar";
  const actions = mod.extractLinkActionsFromText(text);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].type, "external_link");
  assert.equal(actions[0].url, "https://example.com/cat");
  assert.equal(actions[0].label, "Open example.com");
  assert.equal(actions[1].url, "http://foo.bar");
  assert.equal(actions[1].label, "Open foo.bar");
});

test("extractLinkActionsFromText ignores URLs wrapped in markdown links", async () => {
  const mod = await import("../../chatActions.js");
  const text = "[click here](https://example.com) and a raw https://real.link/page";
  const actions = mod.extractLinkActionsFromText(text);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].url, "https://real.link/page");
});

test("extractLinkActionsFromText returns empty array for null/undefined/empty", async () => {
  const mod = await import("../../chatActions.js");
  assert.deepEqual(mod.extractLinkActionsFromText(null), []);
  assert.deepEqual(mod.extractLinkActionsFromText(undefined), []);
  assert.deepEqual(mod.extractLinkActionsFromText(""), []);
});

test("extractLinkActionsFromText returns empty array for text without URLs", async () => {
  const mod = await import("../../chatActions.js");
  assert.deepEqual(mod.extractLinkActionsFromText("just plain text no urls"), []);
});

test("normalizeMessageActions merges extracted link actions with existing actions", async () => {
  const mod = await import("../../chatActions.js");
  const message = {
    content: "See https://example.com for details",
    actions: [{ type: "route", to: "/minions", label: "View minions" }]
  };
  const result = mod.normalizeMessageActions(message);
  assert.equal(result.actions.length, 2);
  assert.equal(result.actions[0].type, "route");
  assert.equal(result.actions[1].type, "external_link");
  assert.equal(result.actions[1].url, "https://example.com");
});

test("normalizeMessageActions deduplicates by URL", async () => {
  const mod = await import("../../chatActions.js");
  const message = {
    content: "Visit https://example.com and also https://example.com again",
    actions: [{ type: "external_link", url: "https://example.com", label: "Open example.com" }]
  };
  const result = mod.normalizeMessageActions(message);
  const externalLinks = result.actions.filter((a) => a.type === "external_link");
  assert.equal(externalLinks.length, 1);
  assert.equal(externalLinks[0].url, "https://example.com");
});

test("normalizeMessageActions returns message as-is for null/undefined message", async () => {
  const mod = await import("../../chatActions.js");
  assert.equal(mod.normalizeMessageActions(null), null);
  assert.equal(mod.normalizeMessageActions(undefined), undefined);
});

test("normalizeMessageActions keeps existing actions when content has no URLs", async () => {
  const mod = await import("../../chatActions.js");
  const message = {
    content: "Just text with no links",
    actions: [{ type: "route", to: "/home", label: "Go home" }]
  };
  const result = mod.normalizeMessageActions(message);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].label, "Go home");
});
