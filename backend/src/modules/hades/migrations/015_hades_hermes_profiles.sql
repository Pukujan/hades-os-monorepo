CREATE TABLE IF NOT EXISTS hades_hermes_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  profile_name TEXT NOT NULL UNIQUE,
  hermes_home TEXT,
  api_host TEXT NOT NULL DEFAULT '127.0.0.1',
  api_port INTEGER NOT NULL,
  edge_base_url TEXT,
  encrypted_api_server_key TEXT NOT NULL,
  api_server_key_hash TEXT NOT NULL,
  gateway_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hades_hermes_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hades_hermes_profiles_user_tenant
  ON hades_hermes_profiles (user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_hades_hermes_profiles_profile_name
  ON hades_hermes_profiles (profile_name);
