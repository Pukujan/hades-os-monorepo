-- Hades OS — add missing columns to hades_minions
-- Run after 001–007 in your Supabase SQL editor.

alter table hades_minions
  add column if not exists icon text,
  add column if not exists instructions text,
  add column if not exists trigger_type text,
  add column if not exists target_social text,
  add column if not exists schema_version text;

