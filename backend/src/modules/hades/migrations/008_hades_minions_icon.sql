-- Hades OS — add icon column to hades_minions
-- Run after 001–007 in your Supabase SQL editor.

alter table hades_minions
  add column if not exists icon text;

