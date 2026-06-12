import { test } from "node:test";
import assert from "node:assert/strict";
import { runHermesContextLimitSmoke } from "./smoke-hermes-context-limit.mjs";

test("Hermes accepts a 30720 context configuration and still rejects 29999", async () => {
  const logs = [];
  const result = runHermesContextLimitSmoke({
    logger: { log: (line) => logs.push(line) }
  });

  assert.equal(result.minimumContextLength, 30000);
  assert.equal(result.resolved30720, 30720);
  assert.equal(result.resolved29999, 29999);
  assert.equal(result.accepts30720, true);
  assert.equal(result.rejects29999, true);
  assert.equal(logs.some((line) => line.includes("30720")), true);
  assert.equal(logs.some((line) => line.includes("29999")), true);
});
