#!/usr/bin/env node
/** @deprecated Use `npm run condense-models` (model condenser API) instead. */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const script = join(dirname(fileURLToPath(import.meta.url)), "condense-models.mjs");
const child = spawn(process.execPath, [script, ...process.argv.slice(2)], {
  stdio: "inherit"
});
child.on("exit", (code) => process.exit(code ?? 0));
