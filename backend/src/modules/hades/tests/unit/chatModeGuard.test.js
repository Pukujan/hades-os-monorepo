import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateGeneralChatScope,
  guardGeneralChatScope,
} from "../../services/chatModeGuard.js";

test("flags Forge leakage in General chat", () => {
  const result = validateGeneralChatScope({
    reply: "Tell me what kind of minion you want.",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "forge_leak_in_general_chat");
});

test("flags welcome to the forge in General chat", () => {
  const result = validateGeneralChatScope({
    reply: "Welcome to the Forge. Let me help you build.",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "forge_leak_in_general_chat");
});

test("allows rude or dismissive Hades tone if it stays in scope", () => {
  const result = validateGeneralChatScope({
    reply: "You found the door. Speak.",
  });

  assert.equal(result.ok, true);
});

test("allows dry superior tone", () => {
  const result = validateGeneralChatScope({
    reply: "Socials. Telegram lives there. Try not to lose the token.",
  });

  assert.equal(result.ok, true);
});

test("routes Forge leakage to Forge without controlling personality otherwise", () => {
  const guarded = guardGeneralChatScope({
    reply: "Tell me what kind of minion you want.",
  });

  assert.equal(guarded.reply, "Forge matter. Wrong room.");
  assert.ok(guarded.actions.some((a) => a.label === "Open Forge"));
});

test("passes through clean response unchanged", () => {
  const input = { reply: "You found the door. Speak.", actions: [] };
  const guarded = guardGeneralChatScope(input);

  assert.equal(guarded, input);
});
