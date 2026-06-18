import path from "node:path";
import crypto from "node:crypto";

const SECRET_FILE_PATTERNS = [
  /\.env$/i,
  /\.env\.\w+$/i,
  /secret/i,
  /token/i,
  /key/i,
];

export function createHermesStateStore({ objectStore, filesystem }) {
  function isSecretOrTraversal(relativePath, homeDir) {
    const normalized = path.normalize(relativePath).replace(/\\/g, "/");
    if (SECRET_FILE_PATTERNS.some((p) => p.test(normalized))) {
      return true;
    }
    const resolved = path.resolve(homeDir, normalized);
    if (!resolved.startsWith(path.resolve(homeDir))) {
      return true;
    }
    return false;
  }

  async function hydrateWorkspace({ userId, tenantId, workspace, objects }) {
    for (const obj of objects) {
      const result = await objectStore.getObject({ key: obj.key });
      if (result && result.body) {
        const targetPath = path.join(workspace.homeDir, obj.relativePath);
        await filesystem.writeFile(targetPath, result.body);
      }
    }
  }

  async function snapshotWorkspace({ userId, tenantId, workspace }) {
    const changedFiles = await filesystem.readChangedFiles();
    const objects = [];

    for (const file of changedFiles) {
      if (isSecretOrTraversal(file.relativePath, workspace.homeDir)) {
        throw new Error("Secret or traversal detected in state files");
      }
      const objectKey = `tenants/${tenantId}/users/${userId}/hermes/${file.relativePath}`;
      const contentHash = crypto.createHash("sha256").update(file.content).digest("hex");
      await objectStore.putObject({
        key: objectKey,
        body: file.content,
        contentType: file.relativePath.endsWith(".md") ? "text/markdown" : "application/octet-stream",
      });
      objects.push({ objectKey, relativePath: file.relativePath, contentHash });
    }

    return { objects };
  }

  return { hydrateWorkspace, snapshotWorkspace };
}
