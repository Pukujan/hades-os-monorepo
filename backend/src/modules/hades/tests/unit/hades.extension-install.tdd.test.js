import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { describe, test } from "node:test";
import { createHadesRoutes } from "../../routes/hades.routes.js";
import { createHadesRepository } from "../../repositories/hades.repository.js";
import { createHadesService } from "../../services/hades.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function request(app, { method = "GET", path, body } = {}) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : Buffer.from(await response.arrayBuffer());
    return { response, payload };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function makeApp(service) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authContext = { userId: "user-a", tenantId: "tenant-a" };
    next();
  });
  app.use("/api/hades", createHadesRoutes({ service }));
  return app;
}

describe("Hades extension install API TDD contract", () => {
  test("GET /extension/download returns the built extension bundle as an attachment", async () => {
    const bundle = Buffer.from("fake-zip");
    const app = makeApp({
      downloadExtensionBundle: async (authContext) => ({
        filename: `hades-extension-${authContext.userId}.zip`,
        contentType: "application/zip",
        buffer: bundle,
      }),
    });

    const { response, payload } = await request(app, { path: "/api/hades/extension/download" });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/zip");
    assert.match(response.headers.get("content-disposition") || "", /attachment/);
    assert.match(response.headers.get("content-disposition") || "", /hades-extension-user-a\.zip/);
    assert.equal(Buffer.compare(payload, bundle), 0);
  });

  test("POST /extension/keys returns a one-time secret and listed keys stay redacted", async () => {
    const calls = [];
    const app = makeApp({
      createExtensionKey: async (body, authContext) => {
        calls.push({ body, authContext });
        return {
          record: {
            id: "key-1",
            name: body.name,
            scopes: body.scopes,
            secretPreview: "hades_ext_...abcd",
            revokedAt: null,
          },
          secret: "hades_ext_live_secret_once",
        };
      },
      listExtensionKeys: async () => ({
        keys: [
          {
            id: "key-1",
            name: "Chrome extension",
            scopes: ["workflow:read", "document:upload", "approval:create"],
            secretPreview: "hades_ext_...abcd",
            revokedAt: null,
          },
        ],
      }),
    });

    const created = await request(app, {
      method: "POST",
      path: "/api/hades/extension/keys",
      body: {
        name: "Chrome extension",
        scopes: ["workflow:read", "document:upload", "approval:create"],
      },
    });
    const listed = await request(app, { path: "/api/hades/extension/keys" });

    assert.equal(created.response.status, 201);
    assert.equal(created.payload.secret, "hades_ext_live_secret_once");
    assert.equal(calls[0].authContext.userId, "user-a");
    assert.equal(listed.response.status, 200);
    assert.equal(Object.hasOwn(listed.payload.keys[0], "secret"), false);
    assert.equal(listed.payload.keys[0].secretPreview, "hades_ext_...abcd");
  });

  test("extension zip contains manifest.json at root for Chrome extension loading", () => {
    const zipPath = join(__dirname, "../../../../../../extension/dist/extension.zip");
    assert.ok(existsSync(zipPath), "extension.zip must exist at extension/dist/extension.zip");
    const buf = readFileSync(zipPath);

    // Find EOCD and enumerate central directory entries
    let eocd = buf.length - 22;
    while (eocd >= 0 && !(buf[eocd] === 0x50 && buf[eocd + 1] === 0x4b && buf[eocd + 2] === 0x05 && buf[eocd + 3] === 0x06)) eocd--;
    assert.ok(eocd >= 0, "ZIP must have valid EOCD signature.");

    const entries = buf.readUInt16LE(eocd + 8);
    let pos = buf.readUInt32LE(eocd + 16);
    const names = [];
    for (let i = 0; i < entries; i++) {
      const nameLen = buf.readUInt16LE(pos + 28);
      names.push(buf.toString("utf8", pos + 46, pos + 46 + nameLen));
      pos += 46 + nameLen;
    }

    assert.ok(names.includes("manifest.json"), "manifest.json must be at zip root, not in a subdirectory.");
    assert.ok(!names.some((n) => n.includes("public/manifest.json")), "manifest.json must NOT be under public/ path.");
    assert.ok(names.includes("popup.html"), "popup.html must be at zip root.");
  });

  test("real service download route returns the packaged extension zip artifact", async () => {
    const service = createHadesService({
      repository: createHadesRepository(),
      scopedRepos: {},
      hermes: { buildResponse: async () => ({ assistantMessage: { content: "ok" } }) },
    });
    const app = makeApp(service);

    const { response, payload } = await request(app, { path: "/api/hades/extension/download" });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/zip");
    assert.match(response.headers.get("content-disposition") || "", /extension\.zip|hades-extension/);
    assert.equal(Buffer.isBuffer(payload), true);
    assert.equal(payload.subarray(0, 2).toString("utf8"), "PK");
  });
});
