import path from "node:path";
import crypto from "node:crypto";

const SECRET_FILE_PATTERNS = [
  /\.env$/i,
  /\.env\.\w+$/i,
  /secret/i,
  /token/i,
  /key/i,
];

export function createHermesStateStore({ objectStore, filesystem, objectStoreFactory, filesystemFactory, repository } = {}) {
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

  function resolveObjectStore({ userId, tenantId }) {
    return objectStoreFactory ? objectStoreFactory({ userId, tenantId }) : objectStore;
  }

  function resolveFilesystem({ workspace }) {
    return filesystemFactory ? filesystemFactory({ workspace }) : filesystem;
  }

  async function hydrateWorkspace({ userId, tenantId, workspace, objects }) {
    const effectiveObjects = objects || (repository ? await repository.listStateObjects({ userId, tenantId }) : []);
    const effectiveObjectStore = resolveObjectStore({ userId, tenantId });
    const effectiveFilesystem = resolveFilesystem({ workspace });

    for (const obj of effectiveObjects) {
      const key = obj.objectKey || obj.object_key || obj.key;
      const relativePath = obj.relativePath || obj.relative_path;
      if (!key || !relativePath) continue;
      const result = await effectiveObjectStore.getObject({ key });
      if (result && result.body) {
        const targetPath = path.join(workspace.homeDir, relativePath);
        await effectiveFilesystem.writeFile(targetPath, result.body);
      }
    }
  }

  async function snapshotWorkspace({ userId, tenantId, workspace }) {
    const effectiveObjectStore = resolveObjectStore({ userId, tenantId });
    const effectiveFilesystem = resolveFilesystem({ workspace });

    const changedFiles = await effectiveFilesystem.readChangedFiles();
    const objects = [];

    for (const file of changedFiles) {
      if (isSecretOrTraversal(file.relativePath, workspace.homeDir)) {
        throw new Error("Secret or traversal detected in state files");
      }
      const objectKey = `tenants/${tenantId}/users/${userId}/hermes/${file.relativePath}`;
      const contentHash = crypto.createHash("sha256").update(file.content).digest("hex");
      await effectiveObjectStore.putObject({
        key: objectKey,
        body: file.content,
        contentType: file.relativePath.endsWith(".md") ? "text/markdown" : "application/octet-stream",
      });
      objects.push({ objectKey, relativePath: file.relativePath, contentHash });

      if (repository) {
        await repository.recordStateObject({
          userId,
          tenantId,
          kind: "hermes_workspace_file",
          objectKey,
          contentHash,
          byteSize: file.content.length,
        });
      }
    }

    return { objects };
  }

  return { hydrateWorkspace, snapshotWorkspace };
}
