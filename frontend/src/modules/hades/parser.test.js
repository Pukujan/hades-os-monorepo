import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAssistantReply, buildTestOutput, createDraftFromMessage, missingDraftFields } from "./parser.js";

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
