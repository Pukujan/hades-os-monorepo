/**
 * Template — copy to backend/src/modules/<module>/adapters/file-storage.adapter.js
 * Contract: documentPersistence v001
 */
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import {
  documentBlobPath,
  documentFolderPath
} from "../../../shared/contracts/documentPersistence.contract.js";

/**
 * @param {object} options
 * @param {import("../../../shared/storage/resolveDocumentStoragePaths.types.js").DocumentStoragePaths} options.storagePaths
 */
export function createFileStorageAdapter({ storagePaths }) {
  /**
   * @param {object} input
   * @param {string} input.documentId
   * @param {string} input.extension
   * @param {Buffer} input.buffer
   * @returns {Promise<{ storagePath: string }>}
   */
  async function saveOriginal({ documentId, extension, buffer }) {
    const storagePath = documentBlobPath(storagePaths, documentId, extension);
    await mkdir(dirname(storagePath), { recursive: true });
    await writeFile(storagePath, buffer);
    return { storagePath };
  }

  /**
   * @param {string} documentId
   * @returns {string}
   */
  function folderFor(documentId) {
    return documentFolderPath(storagePaths, documentId);
  }

  return { saveOriginal, folderFor };
}
