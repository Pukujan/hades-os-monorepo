import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

const repoRoot = process.env.HADES_FASTAPI_REPO
  ? path.resolve(process.env.HADES_FASTAPI_REPO)
  : path.resolve(process.cwd(), "..", "hades-os-fastapi");

const requiredModules = ["auth", "hades", "hermes", "media", "workers"];
const requiredHermesRuntimeFiles = [
  "profile_registry.py",
  "profile_provisioner.py",
  "profile_session_broker.py",
  "edge_auth_proxy.py",
  "gateway_process_manager.py",
];

function rel(...parts) {
  return path.join(repoRoot, ...parts);
}

function assertExists(relativePath, message = `Missing ${relativePath}`) {
  assert.equal(existsSync(rel(relativePath)), true, `${message}\nFastAPI repo: ${repoRoot}`);
}

function read(relativePath) {
  assertExists(relativePath);
  return readFileSync(rel(relativePath), "utf8");
}

function listPythonFiles(startDir) {
  const root = rel(startDir);
  if (!existsSync(root)) return [];
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (![".venv", "__pycache__", ".pytest_cache"].includes(entry.name)) walk(full);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".py")) files.push(full);
    }
  };
  walk(root);
  return files;
}

function readIfExists(relativePath) {
  const full = rel(relativePath);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

describe("FastAPI migration modular contract - static red suite", () => {
  test("new FastAPI repo has the expected project skeleton and dependencies", () => {
    assertExists(".", "Missing FastAPI migration repo. Set HADES_FASTAPI_REPO to the new repo path.");
    assertExists("pyproject.toml");
    assertExists("app/__init__.py");
    assertExists("app/main.py");
    assertExists("app/modules/__init__.py");
    assertExists("tests/contracts");

    const pyproject = read("pyproject.toml");
    for (const dependency of ["fastapi", "pydantic", "pytest", "httpx"]) {
      assert.match(pyproject, new RegExp(dependency, "i"), `pyproject.toml must include ${dependency}`);
    }
  });

  test("app factory registers routers from a module registry instead of hardcoding module routes", () => {
    const main = read("app/main.py");

    assert.match(main, /def\s+create_app\s*\(/, "app/main.py must expose create_app() for tests and deployments.");
    assert.match(main, /FastAPI\s*\(/, "create_app() must instantiate FastAPI.");
    assert.match(main, /include_router\s*\(/, "create_app() must include module routers.");
    assert.match(
      main,
      /module_registry|MODULES|iter_modules|get_enabled_modules/i,
      "Router inclusion must be driven by a module registry/manifest list.",
    );
    assert.doesNotMatch(
      main,
      /from\s+app\.modules\.(hades|hermes|media|workers)\.routes\s+import/i,
      "main.py should not hardcode feature route imports; import module manifests instead.",
    );
  });

  test("bounded modules expose the same contract surfaces as the Express modules", () => {
    for (const moduleName of requiredModules) {
      const moduleDir = `app/modules/${moduleName}`;
      assertExists(`${moduleDir}/__init__.py`);
      assertExists(`${moduleDir}/manifest.py`);
      assertExists(`${moduleDir}/routes.py`);
      assertExists(`${moduleDir}/schemas.py`);
      assertExists(`${moduleDir}/services.py`);
      assertExists(`${moduleDir}/dependencies.py`);

      const manifest = read(`${moduleDir}/manifest.py`);
      assert.match(manifest, /ModuleManifest|module_manifest|manifest\s*=/i);
      assert.match(manifest, /prefix\s*=/i, `${moduleName} manifest must declare an API prefix.`);
      assert.match(manifest, /router\s*=/i, `${moduleName} manifest must expose its APIRouter.`);
      assert.match(manifest, /tags\s*=/i, `${moduleName} manifest must declare OpenAPI tags.`);
    }
  });

  test("route handlers stay thin and depend on services rather than repositories, env, subprocesses, or raw HTTP clients", () => {
    for (const moduleName of requiredModules) {
      const routesPath = `app/modules/${moduleName}/routes.py`;
      const source = read(routesPath);

      assert.match(source, /APIRouter\s*\(/, `${routesPath} must define a FastAPI APIRouter.`);
      assert.match(source, /Depends\s*\(/, `${routesPath} must use FastAPI Depends for DI/auth seams.`);
      assert.doesNotMatch(source, /from\s+app\.modules\.[^.]+\.repositories\b/i, `${routesPath} must not import repositories directly.`);
      assert.doesNotMatch(source, /\bos\.environ\b|\bsubprocess\b|\bPopen\b|\brequests\.|httpx\./, `${routesPath} must not perform env/process/raw HTTP work.`);
      assert.doesNotMatch(source, /\bSession\s*\(|\bselect\s*\(|\bexecute\s*\(/, `${routesPath} must not run database queries directly.`);
    }
  });

  test("committed lint contracts enforce module boundaries, layers, and API docs", () => {
    for (const script of [
      "scripts/check_module_boundaries.py",
      "scripts/check_module_layers.py",
      "scripts/check_api_docs.py",
    ]) {
      assertExists(script);
    }

    for (const contractTest of [
      "tests/contracts/test_module_boundaries.py",
      "tests/contracts/test_module_layers.py",
      "tests/contracts/test_openapi_registry.py",
      "tests/contracts/test_secret_leakage.py",
      "tests/contracts/test_hermes_profile_contract.py",
    ]) {
      assertExists(contractTest);
    }

    const pyproject = read("pyproject.toml");
    for (const commandName of ["lint:boundaries", "lint:layers", "lint:api-docs", "lint:architecture"]) {
      assert.match(pyproject, new RegExp(commandName.replace(":", "[:_-]"), "i"), `pyproject must expose ${commandName}.`);
    }
  });

  test("Hermes FastAPI module preserves Hades edge-auth/profile-runtime architecture", () => {
    const hermesRoot = "app/modules/hermes";
    for (const fileName of requiredHermesRuntimeFiles) {
      assertExists(`${hermesRoot}/${fileName}`);
    }

    const combined = requiredHermesRuntimeFiles
      .map((fileName) => read(`${hermesRoot}/${fileName}`))
      .join("\n");

    for (const requiredToken of ["SOUL.md", "config.yaml", ".env", "state.db", "API_SERVER_KEY"]) {
      assert.match(combined, new RegExp(requiredToken.replace(".", "\\.")), `Hermes runtime must account for ${requiredToken}.`);
    }

    assert.match(combined, /127\.0\.0\.1|localhost/i, "Hermes profile API targets must remain private loopback targets.");
    assert.match(combined, /edge[_-]?injected|inject/i, "Hades must inject API_SERVER_KEY server-side.");
    assert.doesNotMatch(combined, /anonymous[_-]anonymous|tenantId\s*=\s*["']anonymous|userId\s*=\s*["']anonymous/i);
  });

  test("OpenAPI/docs registry preserves current browser-facing Hades and Hermes contracts", () => {
    assertExists("docs/API.md");
    assertExists("docs/hades/API.md");

    const docs = `${read("docs/API.md")}\n${read("docs/hades/API.md")}`;
    for (const route of [
      "POST /api/hades/hermes/sessions",
      "POST /api/hades/hermes/{profile_name}/media",
      "GET /api/hades/hermes/{profile_name}/media/{attachment_id}",
      "POST /api/hades/hermes/speak",
      "POST /api/hades/hermes/transcribe",
      "POST /api/hades/hermes/{profile_name}/v1/responses",
    ]) {
      assert.ok(docs.includes(route), `Docs must include ${route}`);
    }
  });

  test("response schemas never expose browser-forbidden secrets", () => {
    const schemaFiles = listPythonFiles("app/modules").filter((file) => file.endsWith("schemas.py"));
    assert.ok(schemaFiles.length > 0, "Expected module schemas.py files.");

    const forbidden = [
      "api_server_key",
      "apiServerKey",
      "OPENROUTER_API_KEY",
      "GROQ_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "service_role",
    ];
    for (const file of schemaFiles) {
      const source = readFileSync(file, "utf8");
      for (const token of forbidden) {
        assert.equal(
          source.includes(token),
          false,
          `${path.relative(repoRoot, file)} must not expose ${token} in Pydantic response schemas.`,
        );
      }
    }
  });

  test("migration docs explain the module mapping from Express to FastAPI", () => {
    assertExists("docs/architecture/MODULAR_CONTRACTS.md");
    const docs = read("docs/architecture/MODULAR_CONTRACTS.md");

    for (const term of [
      "APIRouter",
      "Depends",
      "Pydantic",
      "ModuleManifest",
      "routes",
      "services",
      "repositories",
      "adapters",
      "domain",
      "OpenAPI",
      "Hermes profile",
    ]) {
      assert.ok(docs.includes(term), `MODULAR_CONTRACTS.md must explain ${term}`);
    }

    const oldMigrationDoc = readIfExists("docs/hades/DAYTONA_MODAL_FASTAPI_MIGRATION_STUDY.md");
    assert.doesNotMatch(oldMigrationDoc, /TODO|TBD/i, "Migration docs should not leave TODO/TBD placeholders.");
  });
});
