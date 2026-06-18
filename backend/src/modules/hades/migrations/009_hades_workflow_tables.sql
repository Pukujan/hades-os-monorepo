-- Hades OS — Workflow tables for the orchestrator runtime
-- Run in your Supabase SQL editor or via migration tool.

-- ── hades_extension_approvals: add workflow_run_id and tool_call_id ──
alter table hades_extension_approvals add column if not exists workflow_run_id uuid;
alter table hades_extension_approvals add column if not exists tool_call_id text;

create index if not exists idx_hades_extension_approvals_workflow_run
  on hades_extension_approvals(workflow_run_id);

-- ── hades_workflow_definitions ────────────────────────────────────
-- Tenant-scoped workflow definitions with goals, tool grants, approval gates.
create table if not exists hades_workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  name text not null,
  goal text not null,
  prompt text,
  guardrails jsonb not null default '[]'::jsonb,
  allowed_tools jsonb not null default '[]'::jsonb,
  approval_policy jsonb not null default '{}'::jsonb,
  required_context jsonb not null default '[]'::jsonb,
  explanation jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  schema_version integer not null default 1,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_workflow_definitions_user_tenant
  on hades_workflow_definitions(user_id, tenant_id);

alter table hades_workflow_definitions enable row level security;

create policy "hades_workflow_definitions user owns rows"
  on hades_workflow_definitions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_workflow_runs ───────────────────────────────────────────
-- Run tracking for the orchestrator — one row per execution attempt.
create table if not exists hades_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  workflow_definition_id uuid references hades_workflow_definitions(id) on delete set null,
  status text not null default 'running',
  input jsonb not null default '{}'::jsonb,
  output jsonb default '{}'::jsonb,
  idempotency_key text,
  retry_count integer not null default 0,
  completed_tool_call_ids jsonb not null default '[]'::jsonb,
  last_checkpoint jsonb default null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_workflow_runs_user_tenant
  on hades_workflow_runs(user_id, tenant_id);

create index if not exists idx_hades_workflow_runs_definition
  on hades_workflow_runs(workflow_definition_id);

alter table hades_workflow_runs enable row level security;

create policy "hades_workflow_runs user owns rows"
  on hades_workflow_runs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_workflow_audit_logs ─────────────────────────────────────
-- Tool call audit records for workflow executions.
create table if not exists hades_workflow_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  workflow_run_id uuid references hades_workflow_runs(id) on delete cascade,
  tool_name text not null,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hades_workflow_audit_logs_user_tenant
  on hades_workflow_audit_logs(user_id, tenant_id);

create index if not exists idx_hades_workflow_audit_logs_run
  on hades_workflow_audit_logs(workflow_run_id);

alter table hades_workflow_audit_logs enable row level security;

create policy "hades_workflow_audit_logs user owns rows"
  on hades_workflow_audit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_workflow_run_checkpoints ────────────────────────────────
-- Durable checkpoint snapshots for long-running workflow recovery.
create table if not exists hades_workflow_run_checkpoints (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references hades_workflow_runs(id) on delete cascade,
  step_id text not null,
  status text not null,
  cursor jsonb default null,
  snapshot jsonb default null,
  completed_tool_call_ids jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hades_workflow_run_checkpoints_run
  on hades_workflow_run_checkpoints(run_id);

alter table hades_workflow_run_checkpoints enable row level security;

create policy "hades_workflow_run_checkpoints user owns rows"
  on hades_workflow_run_checkpoints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
