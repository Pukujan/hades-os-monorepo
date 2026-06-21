import test from "node:test";
import assert from "node:assert/strict";
import { createHermesClient } from "../../lib/hermesClient.js";

test("createHermesClient throws when baseUrl is missing", () => {
  assert.throws(
    () => createHermesClient({ apiKey: "sk-test" }),
    /baseUrl is required/,
  );
});

test("createHermesClient throws when apiKey is missing", () => {
  assert.throws(
    () => createHermesClient({ baseUrl: "http://localhost:8080" }),
    /apiKey is required/,
  );
});

test("responses sends request with correct method, headers, and body", async () => {
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ id: "resp-1", output: [] }),
    };
  };

  const client = createHermesClient({
    baseUrl: "http://hermes:8080",
    apiKey: "sk-secret",
    fetchImpl: fakeFetch,
  });

  const result = await client.responses({
    input: "hello",
    conversation: "conv-1",
  });

  assert.equal(captured.url, "http://hermes:8080/v1/responses");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.authorization, "Bearer sk-secret");
  assert.equal(captured.init.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(captured.init.body), {
    input: "hello",
    conversation: "conv-1",
  });
  assert.deepEqual(result, { id: "resp-1", output: [] });
});

test("chat sends request to chat completions endpoint", async () => {
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ choices: [{ message: { role: "assistant", content: "hi" } }] }),
    };
  };

  const client = createHermesClient({
    baseUrl: "http://hermes:8080",
    apiKey: "sk-secret",
    fetchImpl: fakeFetch,
  });

  const result = await client.chat({
    model: "deepseek/deepseek-v4-flash",
    messages: [{ role: "user", content: "hello" }],
  });

  assert.equal(captured.url, "http://hermes:8080/v1/chat/completions");
  assert.deepEqual(result.choices[0].message.content, "hi");
});

test("requestRaw sends custom path and method", async () => {
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ status: "ok" }),
    };
  };

  const client = createHermesClient({
    baseUrl: "http://hermes:8080",
    apiKey: "sk-secret",
    fetchImpl: fakeFetch,
  });

  await client.requestRaw("/health", { method: "GET" });

  assert.equal(captured.url, "http://hermes:8080/health");
  assert.equal(captured.init.method, "GET");
});

test("throws typed error with status and payload on non-ok response", async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 400,
    statusText: "Bad Request",
    headers: { get: () => "application/json" },
    json: async () => ({ error: "invalid input" }),
  });

  const client = createHermesClient({
    baseUrl: "http://hermes:8080",
    apiKey: "sk-secret",
    fetchImpl: fakeFetch,
  });

  await assert.rejects(
    () => client.responses({ input: "bad" }),
    (err) => {
      assert.equal(err.status, 400);
      assert.deepEqual(err.payload, { error: "invalid input" });
      return true;
    },
  );
});

test("passes abort signal to fetch on timeout", async () => {
  let capturedSignal;
  const fakeFetch = async (_url, init) => {
    capturedSignal = init.signal;
    await new Promise((r) => setTimeout(r, 10));
    return { ok: true, headers: { get: () => "application/json" }, json: async () => ({}) };
  };

  const client = createHermesClient({
    baseUrl: "http://hermes:8080",
    apiKey: "sk-secret",
    fetchImpl: fakeFetch,
    timeoutMs: 5_000,
  });

  await client.responses({ input: "test" });

  assert.ok(capturedSignal);
  assert.equal(capturedSignal.aborted, false);
});

test("trailing slash on baseUrl is normalized", async () => {
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ id: "resp-1" }),
    };
  };

  const client = createHermesClient({
    baseUrl: "http://hermes:8080/",
    apiKey: "sk-secret",
    fetchImpl: fakeFetch,
  });

  await client.responses({ input: "test" });

  assert.equal(captured.url, "http://hermes:8080/v1/responses");
});
