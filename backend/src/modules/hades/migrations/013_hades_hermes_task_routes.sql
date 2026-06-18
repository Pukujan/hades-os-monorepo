CREATE TABLE IF NOT EXISTS hades_hermes_task_routes (
  task_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  process_id TEXT NOT NULL,
  routing_token_hash TEXT NOT NULL,
  destination JSONB,
  runtime_mode TEXT,
  capability_envelope JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE hades_hermes_task_routes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hades_hermes_task_routes_user_tenant
  ON hades_hermes_task_routes (user_id, tenant_id);
