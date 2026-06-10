import express from "express";

/**
 * Minimal Express app for module integration tests.
 * Pass a register function from the module under test (sync or async).
 */
export async function createTestApp(register) {
  const app = express();
  app.use(express.json());
  const context = { eventBus: { emit() {}, on() {} } };
  await register(app, context);
  return app;
}
