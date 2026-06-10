/** @readonly Document upload + DB persistence contract (runtime; not file-exchange). */

export const DOCUMENT_PERSISTENCE_VERSION = "v001";

/** Layout key in local-artifacts.json when using an external artifact root. */
export const UPLOADS_LAYOUT_KEY = "uploads";

/** Default segment under repoRoot or artifactRoot. */
export const DEFAULT_UPLOADS_DIR = "data/uploads";

/** Original upload filename inside each document folder. */
export const ORIGINAL_BLOB_BASENAME = "original";

/** Optional JSON sidecar next to the blob. */
export const METADATA_SIDECAR_BASENAME = "metadata.json";

/** Parse lifecycle stored on documents.status. */
export const DOCUMENT_STATUSES = ["uploaded", "parsing", "parsed", "failed"];

/** document_text_versions.version_type — aligns with DocumentTextVersionModel. */
export const TEXT_VERSION_TYPES = [
  "embedded_text",
  "ocr_text",
  "ai_parsed_text",
  "human_reviewed_text"
];

/** document_text_versions.extraction_method. */
export const EXTRACTION_METHODS = ["pdf_text", "ocr", "llm", "human_review"];

/** In-process event names (eventBus). */
export const DOCUMENT_EVENTS = {
  UPLOADED: "document.uploaded",
  PARSED: "document.parsed",
  PARSE_FAILED: "document.parse_failed",
  DELETED: "document.deleted"
};

/** Logical storage_path when bytes live in document_blobs (Postgres). */
export const DB_BLOB_STORAGE_MARKER = "db://blob";

/** Stable table names — repositories must use these unless version bump. */
export const DB_TABLES = {
  documents: "documents",
  documentTextVersions: "document_text_versions",
  cases: "cases",
  caseStateSnapshots: "case_state_snapshots",
  tasks: "tasks"
};

export {
  resolveDocumentStoragePaths,
  documentBlobPath,
  documentFolderPath
} from "../storage/resolveDocumentStoragePaths.js";
