/**
 * Template — copy to backend/src/modules/<module>/repositories/document.repository.js
 * Contract: documentPersistence v001
 */
import { DB_TABLES } from "../../../shared/contracts/documentPersistence.contract.js";

/**
 * @param {object} options
 * @param {import("pg").Pool | import("better-sqlite3").Database} options.db
 */
export function createDocumentRepository({ db }) {
  /**
   * @param {object} row
   */
  async function insertDocument(row) {
    // TODO: implement with your DB client (pg or better-sqlite3)
    void db;
    void row;
    throw new Error("Document repository not implemented");
  }

  /**
   * @param {string} documentId
   * @param {string} status
   * @param {string} [parseError]
   */
  async function updateDocumentStatus(documentId, status, parseError) {
    void db;
    void documentId;
    void status;
    void parseError;
    throw new Error("Document repository not implemented");
  }

  /**
   * @param {object} version
   */
  async function insertTextVersion(version) {
    void db;
    void version;
    throw new Error("Document repository not implemented");
  }

  /**
   * @param {string} documentId
   */
  async function findDocumentById(documentId) {
    void db;
    void documentId;
    throw new Error("Document repository not implemented");
  }

  return {
    tables: DB_TABLES,
    insertDocument,
    updateDocumentStatus,
    insertTextVersion,
    findDocumentById
  };
}
