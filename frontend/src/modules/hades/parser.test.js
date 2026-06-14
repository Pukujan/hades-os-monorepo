import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAssistantReply, buildTestOutput, createDraftFromMessage, missingDraftFields, stripWrapperTags } from "./parser.js";

test("stripWrapperTags removes <pastor>, <hades>, <persona>, <reply>, <message>, <assistant>, <system>, <think>, <thought> tags", () => {
  assert.equal(stripWrapperTags("<pastor>Hello</pastor>"), "Hello");
  assert.equal(stripWrapperTags("<hades>Reply</hades>"), "Reply");
  assert.equal(stripWrapperTags("<persona>text</persona>"), "text");
  assert.equal(stripWrapperTags("<reply>data</reply>"), "data");
  assert.equal(stripWrapperTags("<message>content</message>"), "content");
  assert.equal(stripWrapperTags("<assistant>output</assistant>"), "output");
  assert.equal(stripWrapperTags("<system>prompt</system>"), "prompt");
  assert.equal(stripWrapperTags("<think>processing</think>"), "processing");
  assert.equal(stripWrapperTags("<thought>inner</thought>"), "inner");
});

test("stripWrapperTags removes self-closing and nested tags", () => {
  assert.equal(stripWrapperTags("<pastor/>Hello"), "Hello");
  assert.equal(stripWrapperTags("<hades /><pastor>nested</pastor>"), "nested");
});

test("stripWrapperTags handles mixed content and multiple tags", () => {
  const input = "<pastor>You're sitting in the underworld lobby.</pastor><hades>What do you need?</hades>";
  assert.equal(stripWrapperTags(input), "You're sitting in the underworld lobby.What do you need?");
});

test("stripWrapperTags returns empty string for null or undefined", () => {
  assert.equal(stripWrapperTags(null), "");
  assert.equal(stripWrapperTags(undefined), "");
  assert.equal(stripWrapperTags(""), "");
});

test("stripWrapperTags preserves text without tags", () => {
  assert.equal(stripWrapperTags("Hello, mortal."), "Hello, mortal.");
});

test("infers a discord cat meme command and asks only for the command name", () => {
  const result = createDraftFromMessage("I want a command to send cat memes in Discord.");

  assert.equal(result.draft.name, "Cat Meme Minion");
  assert.equal(result.draft.targetSocial, "discord");
  assert.equal(result.draft.triggerType, "command");
  assert.equal(result.draft.action, "send a random cat meme GIF");
  assert.equal(result.draft.commandName, null);
  assert.deepEqual(result.missing, ["command name"]);

  const reply = buildAssistantReply(result);
  assert.equal(reply.content, "Nice - I can make that. What command should trigger it?");
  assert.deepEqual(reply.suggestions, ["!catmeme", "!sendcat", "!catgif"]);
});

test("fully specified command request becomes ready to test", () => {
  const result = createDraftFromMessage("Make me a Discord command called !sendcat that sends a random cat meme gif.");

  assert.equal(result.draft.name, "Cat Meme Minion");
  assert.equal(result.draft.targetSocial, "discord");
  assert.equal(result.draft.triggerType, "command");
  assert.equal(result.draft.commandName, "!sendcat");
  assert.equal(result.draft.action, "send a random cat meme GIF");
  assert.equal(result.draft.status, "ready_to_test");
  assert.deepEqual(result.missing, []);
  assert.deepEqual(missingDraftFields(result.draft), []);

  const reply = buildAssistantReply(result);
  assert.equal(reply.content, "Done — I drafted this minion. Want to test it?");
});

test("buildTestOutput returns a stable preview string for cat and chat minions", () => {
  assert.equal(buildTestOutput({ name: "Cat Meme Minion" }), "🐱 random cat meme sent.");
  assert.equal(buildTestOutput({ name: "Chat Summarizer" }), "💬 long chat summarized into 5 bullet notes.");
});
