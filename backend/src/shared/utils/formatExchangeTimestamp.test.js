import test from "node:test";
import assert from "node:assert/strict";
import {
  formatExchangeTimestamp,
  formatWorkLogTimestamp,
  formatHumanReadableUtc,
  normalizeExchangeStamp
} from "./formatExchangeTimestamp.js";

test("formatExchangeTimestamp", () => {
  const stamp = formatExchangeTimestamp(new Date("2026-05-23T15:45:23.767Z"));
  assert.equal(stamp, "2026-05-23_15-45-23Z");
});

test("normalizeExchangeStamp converts legacy compact stamps", () => {
  assert.equal(
    normalizeExchangeStamp("20260523T154523Z"),
    "2026-05-23_15-45-23Z"
  );
  assert.equal(
    normalizeExchangeStamp("2026-05-23_15-45-23Z"),
    "2026-05-23_15-45-23Z"
  );
});

test("formatWorkLogTimestamp", () => {
  const t = formatWorkLogTimestamp(new Date("2026-05-23T15:45:23.767Z"));
  assert.equal(t.date, "2026-05-23");
  assert.equal(t.time, "15-45");
  assert.equal(t.folder, "2026-05-23_15-45-23Z");
});

test("formatHumanReadableUtc", () => {
  const label = formatHumanReadableUtc(new Date("2026-05-24T14:53:00.000Z"));
  assert.match(label, /May 2026/);
  assert.match(label, /14:53/);
  assert.match(label, /UTC/);
});
