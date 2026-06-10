-- Document persistence v001
-- Contract: docs/architecture/contracts/documentPersistence.contract.md
-- Copy to: backend/src/modules/<module>/repositories/migrations/

CREATE TABLE IF NOT EXISTS documents (
  document_id TEXT PRIMARY KEY,
  case_id TEXT,
  source_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  checksum_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'parsing', 'parsed', 'failed')),
  parse_error TEXT,
  title TEXT,
  document_type TEXT,
  page_count INTEGER,
  extraction_status TEXT,
  text_review_status TEXT DEFAULT 'unreviewed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents (case_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);

CREATE TABLE IF NOT EXISTS document_text_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents (document_id) ON DELETE CASCADE,
  case_id TEXT,
  version_type TEXT NOT NULL
    CHECK (version_type IN ('embedded_text', 'ocr_text', 'ai_parsed_text', 'human_reviewed_text')),
  text_content TEXT,
  structured_json TEXT,
  extraction_method TEXT NOT NULL
    CHECK (extraction_method IN ('pdf_text', 'ocr', 'llm', 'human_review')),
  review_status TEXT NOT NULL DEFAULT 'unreviewed',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_text_versions_document_id ON document_text_versions (document_id);

-- Optional: enable when case workflow is implemented
CREATE TABLE IF NOT EXISTS cases (
  case_id TEXT PRIMARY KEY,
  county TEXT,
  court TEXT,
  index_number TEXT,
  case_name TEXT,
  case_type TEXT,
  judge_name TEXT,
  part_name TEXT,
  current_phase TEXT,
  current_mini_phase TEXT,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_state_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases (case_id) ON DELETE CASCADE,
  after_doc_no INTEGER,
  current_phase TEXT,
  current_mini_phase TEXT,
  confirmed_facts_json TEXT,
  carried_forward_context_json TEXT,
  open_tasks_json TEXT,
  completed_tasks_json TEXT,
  conditional_tasks_json TEXT,
  unresolved_human_review_items_json TEXT,
  conflicts_json TEXT,
  audit_notes_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases (case_id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents (document_id) ON DELETE SET NULL,
  task_description TEXT NOT NULL,
  task_type TEXT NOT NULL,
  responsible_party TEXT,
  due_date TEXT,
  due_date_status TEXT,
  status TEXT NOT NULL,
  confidence TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Postgres note: replace TEXT datetime defaults with TIMESTAMPTZ and use gen_random_uuid() if preferred.
