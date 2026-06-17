import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadParser() {
  try {
    return await import("../../services/hadesCommandParser.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Hades command parser.",
        "Implement backend/src/modules/hades/services/hadesCommandParser.js",
        "and export { parseHadesCommand }.",
      ].join(" "),
      { cause: error }
    );
  }
}

describe("Hades command parser", () => {
  test("parseHadesCommand returns null for non-hades messages", async () => {
    const { parseHadesCommand } = await loadParser();
    assert.equal(parseHadesCommand("hello world"), null);
    assert.equal(parseHadesCommand("!other hello"), null);
    assert.equal(parseHadesCommand(""), null);
  });

  test("parseHadesCommand parses !hades with a simple action", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("!hades hello");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "!hades");
    assert.equal(result.rawArgs, "hello");
    assert.equal(result.action, "hello");
  });

  test("parseHadesCommand parses !hades summarize chat N", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("!hades summarize chat 20");
    assert.notEqual(result, null);
    assert.equal(result.action, "summarize");
    assert.equal(result.source, "chat");
    assert.equal(result.count, 20);
    assert.equal(result.rawArgs, "summarize chat 20");
  });

  test("parseHadesCommand parses !hades save as minion", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand('!hades save as minion "my summarizer"');
    assert.notEqual(result, null);
    assert.equal(result.action, "save");
    assert.equal(result.saveTarget, "minion");
    assert.equal(result.name, "my summarizer");
  });

  test("parseHadesCommand treats arbitrary text after !hades as action", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("!hades what is the weather in Tokyo?");
    assert.notEqual(result, null);
    assert.equal(result.action, "what");
    assert.equal(result.rawArgs, "what is the weather in Tokyo?");
  });

  test("parseHadesCommand handles extra whitespace and case sensitivity", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("  !HADES  summarize   chat  5  ");
    assert.notEqual(result, null);
    assert.equal(result.prefix.toLowerCase(), "!hades");
    assert.equal(result.action, "summarize");
    assert.equal(result.source, "chat");
    assert.equal(result.count, 5);
  });

  test("parseHadesCommand returns rawArgs for simple !hades command", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("!hades status");
    assert.notEqual(result, null);
    assert.equal(result.action, "status");
    assert.equal(result.rawArgs, "status");
    assert.equal(result.source, undefined);
    assert.equal(result.count, undefined);
  });

  test("parseHadesCommand with /hades alias works too", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("/hades summarize chat 10");
    assert.notEqual(result, null);
    assert.equal(result.action, "summarize");
    assert.equal(result.source, "chat");
    assert.equal(result.count, 10);
  });

  test("parseHadesCommand accepts bare hades prefix (no ! or /)", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("hades list my todos");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "hades");
    assert.equal(result.action, "list");
    assert.equal(result.rawArgs, "list my todos");
  });

  test("parseHadesCommand bare hades with no args returns action null", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("hades");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "hades");
    assert.equal(result.rawArgs, "");
    assert.equal(result.action, null);
  });

  test("parseHadesCommand still rejects non-hades text", async () => {
    const { parseHadesCommand } = await loadParser();
    assert.equal(parseHadesCommand("hello world"), null);
    assert.equal(parseHadesCommand("hadesomething"), null);
    assert.equal(parseHadesCommand(""), null);
  });

  test("parseHadesCommand bare hades preserves case insensitivity", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("  HADES  summarize   chat  5  ");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "hades");
    assert.equal(result.action, "summarize");
    assert.equal(result.source, "chat");
    assert.equal(result.count, 5);
  });

  test("parseHadesCommand accepts bare forge prefix", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("forge create minion");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "forge");
    assert.equal(result.action, "create");
    assert.equal(result.rawArgs, "create minion");
  });

  test("parseHadesCommand accepts !forge prefix", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("!forge list minions");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "!forge");
    assert.equal(result.action, "list");
  });

  test("parseHadesCommand accepts /forge prefix", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("/forge deploy");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "/forge");
    assert.equal(result.action, "deploy");
  });

  test("parseHadesCommand bare forge with no args returns null action", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("forge");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "forge");
    assert.equal(result.rawArgs, "");
    assert.equal(result.action, null);
  });

  test("parseHadesCommand bare forge preserves case insensitivity", async () => {
    const { parseHadesCommand } = await loadParser();
    const result = parseHadesCommand("  FORGE  create   minion  ");
    assert.notEqual(result, null);
    assert.equal(result.prefix, "forge");
    assert.equal(result.action, "create");
    assert.equal(result.rawArgs, "create   minion");
  });
});
