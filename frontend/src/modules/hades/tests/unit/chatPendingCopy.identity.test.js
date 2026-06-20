import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getFallbackPendingCopy, getPendingCopy } from "../../utils/chatPendingCopy.js";

describe("Hades chat pending copy", () => {
  test("default pending copy names Hades, not Hermes", () => {
    assert.equal(getPendingCopy("hello", "general"), "Hades is thinking.");
    assert.equal(getFallbackPendingCopy("general"), "Hades is thinking.");
  });
});
