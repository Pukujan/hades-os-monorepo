import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

describe("contract test coverage", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );
  const contractFiles = globSync("src/**/*.contract.mjs", {
    cwd: new URL("..", import.meta.url),
  });

  test("npm test covers every .contract.mjs file", () => {
    assert.ok(contractFiles.length > 0, "No .contract.mjs files found");
    const isCovered = (file) =>
      pkg.scripts.test.includes("test:contracts") ||
      pkg.scripts.test.includes(file) ||
      (pkg.scripts.test.includes("node --test") &&
        (file.includes(".test.") || file.includes(".spec.")));
    for (const f of contractFiles) {
      assert.ok(isCovered(f), `Contract ${f} not covered by npm test`);
    }
  });

  test("npm run test:contracts script exists", () => {
    assert.ok(pkg.scripts["test:contracts"], "Missing script: test:contracts");
    assert.ok(
      pkg.scripts["test:contracts"].includes("contract.mjs"),
      "test:contracts does not reference .contract.mjs files"
    );
  });

  test("lint:architecture enforces contract tests via the gate", () => {
    const arch = pkg.scripts["lint:architecture"] || "";
    assert.ok(
      arch.includes("test:contracts"),
      "lint:architecture does not include test:contracts — gate won't enforce"
    );
  });
});
