import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = resolve(__dirname, "../../../../../docs/hermes");

function read(path) {
  return readFileSync(resolve(DOCS_DIR, path), "utf8");
}

function exists(path) {
  try {
    readFileSync(resolve(DOCS_DIR, path));
    return true;
  } catch {
    return false;
  }
}

describe("Hermes discovery docs", () => {
  test("all required files exist", () => {
    assert.ok(exists("README.md"), "README.md");
    assert.ok(exists("MAINTENANCE.md"), "MAINTENANCE.md");
    assert.ok(exists("AGENT_CONTEXT.md"), "AGENT_CONTEXT.md");
    assert.ok(exists("hermes-discovery.json"), "hermes-discovery.json");
    assert.ok(exists("hermes-discovery.md"), "hermes-discovery.md");
    assert.ok(exists("upstream/llms.txt"), "upstream/llms.txt");
    assert.ok(exists("upstream/llms-full.txt"), "upstream/llms-full.txt");
    assert.ok(exists("upstream/hermes-docs.agent.json"), "upstream/hermes-docs.agent.json");
  });

  describe("hermes-discovery.json", () => {
    let doc;
    test("is valid JSON", () => {
      doc = JSON.parse(read("hermes-discovery.json"));
    });

    test("has schema_version", () => {
      assert.equal(typeof doc.schema_version, "string");
      assert.ok(doc.schema_version.length > 0);
    });

    test("has last_updated (ISO 8601)", () => {
      assert.equal(typeof doc.last_updated, "string");
      const ts = new Date(doc.last_updated);
      assert.ok(ts instanceof Date && !isNaN(ts), "valid ISO date");
      const ageMs = Date.now() - ts.getTime();
      const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
      assert.ok(ageMs < maxAgeMs, `last_updated is recent (<90d, was ${Math.round(ageMs / 86400000)}d ago)`);
    });

    test("has hermes.version string", () => {
      assert.equal(typeof doc.hermes.version, "string");
      assert.ok(doc.hermes.version.startsWith("v"));
    });

    test("hermes has binary_path", () => {
      assert.equal(typeof doc.hermes.binary_path, "string");
      assert.ok(doc.hermes.binary_path.endsWith("hermes"));
    });

    test("has container section with memory and cpu", () => {
      assert.ok(doc.container.memory_limit_bytes > 0);
      assert.ok(doc.container.cpu_count > 0);
    });

    test("has subcommands (at least 40 of 50)", () => {
      const count = Object.keys(doc.subcommands).length;
      assert.ok(count >= 40, `expected ≥40 subcommands, got ${count}`);
    });

    test("chat subcommand is tested", () => {
      assert.ok(doc.subcommands.chat.tested);
    });

    test("skills subcommand is tested", () => {
      assert.ok(doc.subcommands.skills.tested);
    });

    test("profile subcommand is tested", () => {
      assert.ok(doc.subcommands.profile.tested);
    });

    test("has home_directory with actual_path", () => {
      assert.equal(typeof doc.home_directory.actual_path, "string");
      assert.ok(doc.home_directory.actual_path.startsWith("/tmp"));
    });

    test("has workspace_structure", () => {
      const keys = Object.keys(doc.workspace_structure);
      assert.ok(keys.length >= 10, `expected ≥10 workspace entries, got ${keys.length}`);
      assert.ok(doc.workspace_structure["SOUL.md"]);
      assert.ok(doc.workspace_structure["state.db"]);
    });

    test("persistence section confirms skills survive process exit", () => {
      assert.ok(doc.persistence.skills_survive_process_exit === true);
    });

    test("has confirmed_findings array with entries", () => {
      assert.ok(Array.isArray(doc.confirmed_findings));
      assert.ok(doc.confirmed_findings.length >= 5);
    });

    test("has open_questions array", () => {
      assert.ok(Array.isArray(doc.open_questions));
      assert.ok(doc.open_questions.length >= 3);
    });
  });

  describe("hermes-discovery.md", () => {
    let content;
    test("is readable", () => {
      content = read("hermes-discovery.md");
      assert.equal(typeof content, "string");
      assert.ok(content.length > 1000);
    });

    test("mentions HERMES_HOME", () => {
      assert.ok(content.includes("HERMES_HOME"));
    });

    test("mentions skills system", () => {
      assert.ok(content.includes("skills") || content.includes("Skills"));
    });

    test("mentions Railway", () => {
      assert.ok(content.includes("Railway"));
    });
  });

  describe("upstream Hermes docs cache", () => {
    test("official compact index has machine-readable docs links", () => {
      const content = read("upstream/llms.txt");
      assert.ok(content.includes("Messaging Platforms"));
      assert.ok(content.includes("Skills System"));
      assert.ok(content.includes("Memory"));
      assert.ok(content.includes("Context Files"));
    });

    test("official full corpus is vendored for offline agent use", () => {
      const content = read("upstream/llms-full.txt");
      assert.ok(content.length > 1_000_000);
      assert.ok(content.includes("Telegram"));
      assert.ok(content.includes("Discord"));
      assert.ok(content.includes("HERMES_HOME"));
    });

    test("agent JSON index is parseable and captures Hades integration stance", () => {
      const doc = JSON.parse(read("upstream/hermes-docs.agent.json"));
      assert.equal(doc.schema_version, "1.0.0");
      assert.ok(doc.source.local_full.endsWith("llms-full.txt"));
      assert.ok(Array.isArray(doc.sections));
      assert.ok(doc.sections.length >= 5);
      assert.match(doc.hades_integration_notes.recommended_model, /HERMES_HOME/);
      assert.match(doc.hades_integration_notes.routing, /taskId/);
    });
  });
});
