import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);

async function git(args, cwd) {
  try {
    const { stdout } = await exec("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
    return stdout.trim();
  } catch (err) {
    return err.stdout?.trim() || "";
  }
}

/**
 * @param {string} repoRoot
 */
export async function collectGitSnapshot(repoRoot) {
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
  const sha = await git(["rev-parse", "HEAD"], repoRoot);
  const shortSha = await git(["rev-parse", "--short", "HEAD"], repoRoot);
  const statusPorcelain = await git(["status", "--porcelain"], repoRoot);
  const diffStat = await git(["diff", "--stat", "HEAD"], repoRoot);
  const diffCachedStat = await git(["diff", "--cached", "--stat"], repoRoot);
  const logOneline = await git(["log", "-5", "--oneline"], repoRoot);

  const changedFiles = statusPorcelain
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const path = line.slice(3);
      return { code, path };
    });

  return {
    branch: branch || "unknown",
    sha: sha || "unknown",
    shortSha: shortSha || "unknown",
    statusPorcelain,
    changedFiles,
    diffStatAgainstHead: diffStat,
    diffCachedStat,
    recentCommits: logOneline.split("\n").filter(Boolean)
  };
}
