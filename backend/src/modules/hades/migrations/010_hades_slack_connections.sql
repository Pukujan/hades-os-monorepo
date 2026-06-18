-- Migration 010: Add hades_slack_connections table
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS hades_slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  encrypted_token TEXT,
  token_last4 TEXT,
  slack_user_id TEXT,
  slack_team_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_connections_user_tenant
  ON hades_slack_connections (user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_slack_connections_slack_user
  ON hades_slack_connections (slack_user_id);
