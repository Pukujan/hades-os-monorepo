import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["--prefix", "backend", "run", "test:hades-workflow-build-phases"]],
  ["npm", ["--prefix", "frontend", "run", "test:hades-workflow-build-phases-ui"]],
  ["node", ["--test", "scripts/hades-extension-package.tdd.test.mjs"]],
];

let failed = false;

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
