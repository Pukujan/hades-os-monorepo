#!/usr/bin/env node
/**
 * Cursor beforeShellExecution hook — block bare agent `git push`.
 * Use npm run agent:push instead (creates dev logs, then pushes).
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkDevLogForHead } from "../../scripts/lib/check-dev-log-for-head.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function isGitPush(command) {
  return typeof command === "string" && /\bgit\b/.test(command) && /\bpush\b/.test(command);
}

function isAgentPush(command) {
  return typeof command === "string" && /\bagent:push\b/.test(command);
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function main() {
  const raw = readFileSync(0, "utf8");
  const input = raw ? JSON.parse(raw) : {};
  const command = input.command ?? "";

  if (isAgentPush(command) || !isGitPush(command)) {
    respond({ permission: "allow" });
    return;
  }

  const result = await checkDevLogForHead(repoRoot);
  if (result.ok) {
    respond({ permission: "allow" });
    return;
  }

  respond({
    permission: "deny",
    user_message: "Agent push requires dev logs first. Use npm run agent:push.",
    agent_message: [
      "Do not run bare `git push`.",
      "When the user asked to push, run this workflow in one turn:",
      "1. npm run agent:push -- --slug <kebab-topic>",
      "2. Fill FILL sections in work-log/dev-logs/agent/ and human/",
      "3. npm run agent:push -- --slug <kebab-topic> --commit",
      "",
      "See .agents/commands/push.md"
    ].join("\n")
  });
}

main().catch((err) => {
  respond({
    permission: "deny",
    user_message: `Dev log check failed: ${err.message}`,
    agent_message: "Use npm run agent:push -- --slug <topic> instead of bare git push."
  });
  process.exit(1);
});
