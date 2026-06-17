import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildForgeDraftFromMinion,
  buildForgeEditUrl,
  getForgeDraftActionLabel,
  getForgeTriggerLabel,
  normalizeSavedMinion,
  paginateMinions
} from "../../utils/minionFlow.js";

test("buildForgeEditUrl encodes the minion id", () => {
  assert.equal(buildForgeEditUrl("minion 123"), "/forge?edit=minion%20123");
});

test("normalizeSavedMinion preserves snake_case and adds version metadata", () => {
  const minion = normalizeSavedMinion({
    id: "m1",
    name: "Cat Courier",
    command_name: "!sendcat",
    target_social: "discord",
    trigger_type: "command",
  });

  assert.equal(minion.commandName, "!sendcat");
  assert.equal(minion.targetSocial, "discord");
  assert.equal(minion.triggerType, "command");
  assert.equal(minion.version, "1.0.0");
  assert.equal(minion.schemaVersion, "hades.minion.v2");
  assert.equal(minion.metadata.version, "1.0.0");
});

test("buildForgeDraftFromMinion builds an editable draft from saved data", () => {
  const draft = buildForgeDraftFromMinion({
    id: "m1",
    name: "Task Helper",
    description: "Turns notes into tasks",
    instructions: "Turn messy instructions into simple task cards.",
    command_name: "!hades",
    target_social: "private",
    trigger_type: "command",
    response_style: "helpful",
    safety_mode: "ask_first",
  });

  assert.equal(draft.name, "Task Helper");
  assert.equal(draft.description, "Turns notes into tasks");
  assert.equal(draft.action, "Turn messy instructions into simple task cards.");
  assert.equal(draft.commandName, "!hades");
  assert.equal(draft.targetSocial, "private");
  assert.equal(draft.triggerType, "command");
  assert.equal(draft.status, "ready_to_test");
});

test("paginateMinions returns a ten-item page with next-page metadata", () => {
  const minions = Array.from({ length: 14 }, (_, index) => ({ id: `m${index + 1}` }));
  const page = paginateMinions(minions, 0, 10);

  assert.equal(page.visibleMinions.length, 10);
  assert.equal(page.hasPrevious, false);
  assert.equal(page.hasNext, true);
  assert.equal(page.totalPages, 2);
});

test("getForgeTriggerLabel uses the new trigger wording", () => {
  assert.equal(getForgeTriggerLabel({ triggerType: "command", commandName: "!sendcat" }), "Command · !sendcat");
  assert.equal(getForgeTriggerLabel({ triggerType: "manual" }), "Manual");
  assert.equal(getForgeTriggerLabel({ triggerType: "watcher" }), "Watcher");
});

test("getForgeDraftActionLabel switches between save and update modes", () => {
  assert.equal(getForgeDraftActionLabel({ isEditing: false }), "Save minion");
  assert.equal(getForgeDraftActionLabel({ isEditing: true }), "Update minion");
});
