import { spawn } from "child_process";
import { join } from "path";

/**
 * @param {string} repoRoot
 * @param {{ run?: boolean }} options
 */
export function runTestSuite(repoRoot, { run = true } = {}) {
  if (!run) {
    return Promise.resolve({
      ran: false,
      exitCode: null,
      passed: [],
      failed: [],
      summary: "skipped (--no-tests)"
    });
  }

  return new Promise((resolve) => {
    const child = spawn("npm", ["test"], {
      cwd: repoRoot,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "0" }
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      const combined = `${stdout}\n${stderr}`;
      const passed = [];
      const failed = [];

      for (const line of combined.split("\n")) {
        if (/✔|✓|pass/i.test(line) && line.length < 200) passed.push(line.trim());
        if (/✖|✗|fail/i.test(line) && line.length < 200) failed.push(line.trim());
      }

      const suitesMatch = combined.match(/ℹ tests (\d+)[\s\S]*?ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/);
      const summary = suitesMatch
        ? `tests=${suitesMatch[1]} pass=${suitesMatch[2]} fail=${suitesMatch[3]} exit=${code}`
        : `exit=${code}`;

      resolve({
        ran: true,
        exitCode: code ?? 1,
        passed: [...new Set(passed)].slice(0, 80),
        failed: [...new Set(failed)].slice(0, 80),
        summary,
        rawTail: combined.slice(-8000)
      });
    });
  });
}
