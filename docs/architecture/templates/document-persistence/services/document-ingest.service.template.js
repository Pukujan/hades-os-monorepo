/**
 * Template — copy to backend/src/modules/<module>/services/document-ingest.service.js
 * Contract: documentPersistence v001
 */
import { randomUUID } from "crypto";
import { extname } from "path";
import {
  DOCUMENT_EVENTS,
  DOCUMENT_STATUSES
} from "../../../shared/contracts/documentPersistence.contract.js";

/**
 * @param {object} deps
 * @param {ReturnType<import("../adapters/file-storage.adapter.js").createFileStorageAdapter>} deps.fileStorage
 * @param {ReturnType<import("../adapters/parser.adapter.js").createParserAdapter>} deps.parser
 * @param {ReturnType<import("../repositories/document.repository.js").createDocumentRepository>} deps.documents
 * @param {{ emit: (event: string, payload: unknown) => void }} deps.eventBus
 */
export function createDocumentIngestService({ fileStorage, parser, documents, eventBus }) {
  /**
   * @param {object} input
   * @param {string} input.originalFilename
   * @param {string} input.mimeType
   * @param {Buffer} input.buffer
   * @param {string} [input.caseId]
   */
  async function uploadAndParse({ originalFilename, mimeType, buffer, caseId }) {
    const documentId = randomUUID();
    const extension = extname(originalFilename).replace(/^\./, "") || "bin";

    const { storagePath } = await fileStorage.saveOriginal({
      documentId,
      extension,
      buffer
    });

    await documents.insertDocument({
      documentId,
      caseId: caseId ?? null,
      sourceFileName: originalFilename,
      mimeType,
      sizeBytes: buffer.length,
      storagePath,
      status: DOCUMENT_STATUSES[0]
    });

    eventBus.emit(DOCUMENT_EVENTS.UPLOADED, { documentId, storagePath, mimeType });

    await documents.updateDocumentStatus(documentId, "parsing");

    try {
      const parsed = await parser.parseDocument({ storagePath, mimeType });
      const versionId = randomUUID();
      await documents.insertTextVersion({
        id: versionId,
        documentId,
        caseId: caseId ?? null,
        versionType: parsed.versionType,
        textContent: parsed.textContent ?? null,
        structuredJson: parsed.structuredJson ?? null,
        extractionMethod: parsed.extractionMethod
      });
      await documents.updateDocumentStatus(documentId, "parsed");
      eventBus.emit(DOCUMENT_EVENTS.PARSED, {
        documentId,
        versionId,
        versionType: parsed.versionType
      });
      return { documentId, status: "parsed", versionId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await documents.updateDocumentStatus(documentId, "failed", message);
      eventBus.emit(DOCUMENT_EVENTS.PARSE_FAILED, { documentId, error: message });
      throw error;
    }
  }

  return { uploadAndParse };
}
