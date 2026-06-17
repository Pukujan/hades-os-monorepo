import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["--prefix", "backend", "run", "test:hades-workflow-orchestrator"]],
  ["npm", ["--prefix", "frontend", "run", "test:hades-workflow-ui"]],
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
