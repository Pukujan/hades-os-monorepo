import assert from "node:assert/strict";
import express from "express";
import { describe, test } from "node:test";
import { createHadesRoutes } from "../../routes/hades.routes.js";
import { createHadesRepository } from "../../repositories/hades.repository.js";
import { createHadesService } from "../../services/hades.service.js";

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
