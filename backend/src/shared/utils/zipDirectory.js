import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import archiver from "archiver";

/**
 * Zip a directory to destZipPath. Resolves when the file is fully written.
 * @param {string} sourceDir
 * @param {string} destZipPath
 * @param {{ prefix?: string }} [options]
 */
export function zipDirectory(sourceDir, destZipPath, options = {}) {
  const { prefix = "" } = options;
  return new Promise(async (resolve, reject) => {
    try {
      await mkdir(dirname(destZipPath), { recursive: true });
      const output = createWriteStream(destZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => resolve(destZipPath));
      output.on("error", reject);
      archive.on("error", reject);

      archive.pipe(output);
      archive.directory(sourceDir, prefix || false);
      await archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}
