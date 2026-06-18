CREATE TABLE IF NOT EXISTS hades_hermes_state_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  object_key TEXT NOT NULL,
  content_hash TEXT,
  byte_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hades_hermes_state_objects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hades_hermes_state_objects_user_tenant
  ON hades_hermes_state_objects (user_id, tenant_id);
