import { test } from "node:test";
import assert from "node:assert/strict";
import { findMinionByCommand, normalizeSocialCommandName } from "../../services/socialCommandRouting.js";

test("normalizeSocialCommandName treats slash and bang commands as the same command", () => {
  assert.equal(normalizeSocialCommandName("/sendcat lawyer cat"), "!sendcat");
  assert.equal(normalizeSocialCommandName("!sendcat lawyer cat"), "!sendcat");
  assert.equal(normalizeSocialCommandName("sendcat lawyer cat"), "!sendcat");
});

test("findMinionByCommand matches slash input to a bang command minion", () => {
  const minion = findMinionByCommand("/sendcat lawyer cat", [
    { id: "m1", commandName: "!other" },
    { id: "m2", command_name: "!sendcat" },
  ]);

  assert.equal(minion.id, "m2");
});
