import { test } from "node:test";
import assert from "node:assert/strict";
import { getPendingCopy, getFallbackPendingCopy } from "../../chatPendingCopy.js";

test("uses price-search copy for shopping/search tasks", () => {
  assert.equal(getPendingCopy("find the cheapest nike pegasus"), "Searching prices...");
  assert.equal(getPendingCopy("current Nike Air Pegasus prices"), "Searching prices...");
});

test("uses integration copy for integration tasks", () => {
  assert.equal(getPendingCopy("test telegram"), "Checking the wire...");
  assert.equal(getPendingCopy("connect github"), "Checking the wire...");
});

test("uses forge-specific copy when conversationType is forge", () => {
  assert.equal(getPendingCopy("test the minion", "forge"), "Testing the minion.");
  assert.equal(getPendingCopy("simulate a run", "forge"), "Testing the minion.");
  assert.equal(getPendingCopy("save this minion", "forge"), "Binding the minion.");
  assert.equal(getPendingCopy("hello", "forge"), "Heating the forge.");
});

test("uses default Hades copy otherwise", () => {
  assert.equal(getPendingCopy("hello"), "Hades is thinking.");
  assert.equal(getPendingCopy("what is a minion"), "Hades is thinking.");
});

test("getFallbackPendingCopy returns mode-aware fallback", () => {
  assert.equal(getFallbackPendingCopy("forge"), "Heating the forge.");
  assert.equal(getFallbackPendingCopy("general"), "Hades is thinking.");
  assert.equal(getFallbackPendingCopy(), "Hades is thinking.");
});
