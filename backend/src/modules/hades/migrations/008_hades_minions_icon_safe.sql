-- Safe version: adds v2 columns to hades_minions (idempotent).
alter table hades_minions add column if not exists icon text;
alter table hades_minions add column if not exists instructions text;
alter table hades_minions add column if not exists trigger_type text;
alter table hades_minions add column if not exists target_social text;
alter table hades_minions add column if not exists schema_version text;
alter table hades_minions add column if not exists version text;
alter table hades_minions add column if not exists metadata jsonb not null default '{}'::jsonb;
