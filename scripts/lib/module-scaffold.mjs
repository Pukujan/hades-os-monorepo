export function toTitleCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toComponentName(moduleName) {
  return moduleName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function getBackendFiles(moduleName) {
  const title = toTitleCase(moduleName);
  const files = [];

  const add = (rel, content) => files.push({ rel, content });

  add("index.js", `import { createModuleRouter } from "./routes/index.js";
import { registerModuleEvents } from "./events/index.js";
import { moduleConfig } from "./config/index.js";

export function register(app, context) {
  const router = createModuleRouter({ config: moduleConfig, context });
  app.use("/api/${moduleName}", router);
  registerModuleEvents(context);
}
`);

  add("config/index.js", `export const moduleConfig = {
  name: "${moduleName}",
  label: "${title}"
};
`);

  add(
    "routes/index.js",
    `import { Router } from "express";
import { createHealthRoutes } from "./health.routes.js";

export function createModuleRouter({ config, context }) {
  const router = Router();
  router.use(createHealthRoutes({ config, context }));
  return router;
}
`
  );

  add(
    "routes/health.routes.js",
    `import { Router } from "express";
import { getHealth } from "../services/health.service.js";

export function createHealthRoutes({ config }) {
  const router = Router();
  router.get("/health", (_req, res) => {
    res.json(getHealth(config));
  });
  return router;
}
`
  );

  add(
    "services/health.service.js",
    `export function getHealth(config) {
  return {
    module: config.name,
    status: "ok",
    timestamp: new Date().toISOString()
  };
}
`
  );

  add("repositories/.gitkeep", "");
  add(
    "agents/README.md",
    `# Agents — ${title}

State machine definitions for module AI agents. Pure transition tables only — no HTTP, DB, or LLM calls.

See docs/architecture/contracts/moduleAgentStateMachine.contract.md and docs/architecture/templates/module-agent-state-machine/README.md.
`
  );
  add(
    "agents/manifest.json",
    JSON.stringify(
      {
        module: moduleName,
        version: "v001",
        agents: []
      },
      null,
      2
    ) + "\n"
  );
  add(
    "domain/README.md",
    `# Domain — ${title}

Pure entities, value objects, and domain rules. No Express, DB, or HTTP imports.
`
  );
  add(
    "adapters/README.md",
    `# Adapters — ${title}

Wrappers for external systems (courts, e-file, storage, LLM providers).
`
  );

  add(
    "events/index.js",
    `export function registerModuleEvents(context) {
  // context.eventBus.on("some:event", handler);
  context.eventBus.emit("module:registered", { module: "${moduleName}" });
}
`
  );

  add(
    "schemas/health.schema.js",
    `export function isHealthResponse(value) {
  return (
    value &&
    typeof value.module === "string" &&
    typeof value.status === "string" &&
    typeof value.timestamp === "string"
  );
}
`
  );

  add(
    "utils/index.js",
    `export function moduleSlug(value) {
  return String(value ?? "").trim().toLowerCase();
}
`
  );

  add(
    "prompts/manifest.json",
    JSON.stringify(
      {
        module: moduleName,
        prompts: [
          {
            id: "example-assistant",
            version: "1.0.0",
            file: "templates/example.prompt.js",
            description: "Example prompt for ${title}",
            variables: ["matterId"]
          }
        ]
      },
      null,
      2
    ) + "\n"
  );

  add(
    "prompts/templates/example.prompt.js",
    `export const id = "example-assistant";
export const version = "1.0.0";
export const variables = ["matterId"];

export const template = \`You are a legal workflow assistant for module ${moduleName}.
Matter id: {{matterId}}
Respond with structured JSON only.\`;
`
  );

  add(
    "evals/datasets/example.cases.json",
    JSON.stringify(
      {
        cases: [
          {
            id: "health-shape",
            description: "Health payload includes module name",
            input: {},
            expect: { status: "ok" }
          }
        ]
      },
      null,
      2
    ) + "\n"
  );

  add(
    "evals/runners/example.eval.mjs",
    `import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getHealth } from "../../services/health.service.js";
import { renderPrompt } from "../../../../shared/ai/prompt-registry.js";
import * as examplePrompt from "../../prompts/templates/example.prompt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("${moduleName}: health service matches dataset", () => {
  const dataset = JSON.parse(
    readFileSync(join(__dirname, "../datasets/example.cases.json"), "utf8")
  );
  const expected = dataset.cases[0].expect;
  const result = getHealth({ name: "${moduleName}" });
  assert.equal(result.status, expected.status);
  assert.equal(result.module, "${moduleName}");
});

test("${moduleName}: example prompt renders variables", () => {
  const rendered = renderPrompt(examplePrompt.template, { matterId: "MAT-001" });
  assert.match(rendered, /MAT-001/);
});
`
  );

  add(
    "evals/README.md",
    `# Evals — ${title}

- **datasets/** — fixtures (input, expected constraints).
- **runners/** — \`*.eval.mjs\` files executed via \`npm run test:evals\`.

Run: \`npm run test:evals -- ${moduleName}\`
`
  );

  add(
    "tests/unit/health.service.test.js",
    `import { test } from "node:test";
import assert from "node:assert/strict";
import { getHealth } from "../../services/health.service.js";

test("getHealth returns module metadata", () => {
  const result = getHealth({ name: "${moduleName}" });
  assert.equal(result.module, "${moduleName}");
  assert.equal(result.status, "ok");
});
`
  );

  add(
    "tests/integration/health.routes.test.js",
    `import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../../../../shared/testing/create-test-app.js";
import { register } from "../../index.js";

test("GET /api/${moduleName}/health", async () => {
  const app = createTestApp(register);
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(\`http://127.0.0.1:\${port}/api/${moduleName}/health\`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.module, "${moduleName}");
    assert.equal(body.status, "ok");
  } finally {
    server.close();
  }
});
`
  );

  add(
    "README.md",
    `# ${title}

See [Module internal contract](../../../docs/architecture/MODULE_INTERNAL_CONTRACT.md).

**HTTP API:** [docs/${moduleName}/API.md](../../../docs/${moduleName}/API.md) · [All modules](../../../docs/API.md)

## Layout

\`routes\` → \`services\` → \`repositories\` / \`domain\` / \`adapters\` / \`agents\`

\`agents/\` holds FSM definitions; \`services/agent-runner.service.js\` owns lifecycle (see moduleAgentStateMachine contract).

\`prompts\` + \`evals\` for AI workflows. \`tests/\` for unit and integration coverage.
`
  );

  return files;
}

export function getFrontendFiles(moduleName, label) {
  const componentName = toComponentName(moduleName);
  const files = [];

  const add = (rel, content) => files.push({ rel, content });

  add(
    "index.jsx",
    `import { ${componentName}Page } from "./pages/${componentName}Page.jsx";

export default {
  route: "/${moduleName}",
  label: "${label}",
  Component: ${componentName}Page
};
`
  );

  add(
    `pages/${componentName}Page.jsx`,
    `import { ModuleHealthCard } from "../components/ModuleHealthCard.jsx";

export function ${componentName}Page() {
  return (
    <section>
      <h2>${label}</h2>
      <p>Module shell — extend pages, hooks, and services.</p>
      <ModuleHealthCard />
    </section>
  );
}
`
  );

  add(
    "components/ModuleHealthCard.jsx",
    `import { useModuleHealth } from "../hooks/use-module-health.js";

export function ModuleHealthCard() {
  const { data, error, loading } = useModuleHealth();

  if (loading) return <p>Checking backend…</p>;
  if (error) return <p>Backend unavailable: {error.message}</p>;

  return (
    <p>
      Backend health: <code>{data?.status}</code> ({data?.module})
    </p>
  );
}
`
  );

  add(
    "hooks/use-module-health.js",
    `import { useEffect, useState } from "react";
import { fetchModuleHealth } from "../services/health-api.js";

export function useModuleHealth() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchModuleHealth()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, error, loading };
}
`
  );

  add(
    "services/health-api.js",
    `import { apiGet } from "../../../shared/api/client.js";

export function fetchModuleHealth() {
  return apiGet("/api/${moduleName}/health");
}
`
  );

  add(
    "schemas/health.schema.js",
    `export function isHealthResponse(value) {
  return Boolean(value && typeof value.status === "string");
}
`
  );

  add("utils/index.js", `export function formatModuleLabel(label) {
  return label?.trim() || "Module";
}
`);

  add(
    "prompts/README.md",
    `# UI prompts — ${label}

Optional: assistant copy, tool hints, and in-product AI instructions for this module.
`
  );

  add(
    "tests/unit/health.schema.test.js",
    `import { test } from "node:test";
import assert from "node:assert/strict";
import { isHealthResponse } from "../../schemas/health.schema.js";

test("isHealthResponse validates shape", () => {
  assert.equal(isHealthResponse({ status: "ok" }), true);
  assert.equal(isHealthResponse(null), false);
});
`
  );

  add(
    "README.md",
    `# ${label} (frontend)

See [Module internal contract](../../../docs/architecture/MODULE_INTERNAL_CONTRACT.md).
`
  );

  return files;
}

/** @param {string} moduleName kebab-case */
export function getModuleApiDocContent(moduleName, label = toTitleCase(moduleName)) {
  return `# ${label} — HTTP API

**Base path:** \`/api/${moduleName}\`

**Routes:** [\`backend/src/modules/${moduleName}/routes/\`](../../backend/src/modules/${moduleName}/routes/)

**Contract:** [API documentation contract](../architecture/API_DOCUMENTATION_CONTRACT.md)

---

## Endpoint quick reference

| Method | Path | Description |
|--------|------|-------------|
| GET | \`/health\` | Module health |

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | \`/health\` | Module health and config summary |

---

## Master index

[docs/API.md](../API.md) — add new rows to **Endpoint registry** when you add routes.
`;
}
