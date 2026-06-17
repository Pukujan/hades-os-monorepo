import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["--prefix", "backend", "run", "test:hades-extension-install"]],
  ["npm", ["--prefix", "backend", "run", "test:hades-extension-auth"]],
  ["npm", ["--prefix", "frontend", "run", "test:hades-extension-install-ui"]],
  ["node", ["--test", "scripts/hades-extension-real-build.tdd.test.mjs"]],
  ["node", ["--test", "scripts/hades-extension-design-handoff.contract.test.mjs"]],
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
