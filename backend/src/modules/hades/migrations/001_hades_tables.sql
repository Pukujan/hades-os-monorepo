-- Hades OS — Supabase schema for scoped multi-user data
-- Run in your Supabase SQL editor or via migration tool.
-- Each user-owned table includes user_id + tenant_id for multi-tenant isolation.

-- ── hades_minions ──────────────────────────────────────────────
create table if not exists hades_minions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  name text not null,
  description text,
  command_name text,
  category text,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_minions_user_tenant
  on hades_minions(user_id, tenant_id);

alter table hades_minions enable row level security;

create policy "hades_minions user owns rows"
  on hades_minions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_assignments ──────────────────────────────────────────
create table if not exists hades_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  minion_id uuid not null references hades_minions(id) on delete cascade,
  provider text not null,
  connection_id uuid,
  guild_id text,
  channel_id text,
  command_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_assignments_user_tenant_provider_command
  on hades_assignments(user_id, tenant_id, provider, command_name);

alter table hades_assignments enable row level security;

create policy "hades_assignments user owns rows"
  on hades_assignments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_discord_connections ──────────────────────────────────
create table if not exists hades_discord_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  discord_user_id text not null,
  discord_username text,
  guild_id text,
  channel_id text,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tenant_id, discord_user_id)
);

create index if not exists idx_hades_discord_connections_user_tenant
  on hades_discord_connections(user_id, tenant_id);

create index if not exists idx_hades_discord_connections_external
  on hades_discord_connections(discord_user_id);

alter table hades_discord_connections enable row level security;

create policy "hades_discord_connections user owns rows"
  on hades_discord_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_telegram_connections ─────────────────────────────────
create table if not exists hades_telegram_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  telegram_user_id text not null,
  telegram_username text,
  telegram_chat_id text,
  bot_id text,
  bot_username text,
  encrypted_bot_token text not null,
  token_last4 text,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tenant_id, telegram_user_id)
);

create index if not exists idx_hades_telegram_connections_user_tenant
  on hades_telegram_connections(user_id, tenant_id);

create index if not exists idx_hades_telegram_connections_external
  on hades_telegram_connections(telegram_user_id);

alter table hades_telegram_connections enable row level security;

create policy "hades_telegram_connections user owns rows"
  on hades_telegram_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_conversations ────────────────────────────────────────
create table if not exists hades_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  title text,
  context_type text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_conversations_user_tenant
  on hades_conversations(user_id, tenant_id);

alter table hades_conversations enable row level security;

create policy "hades_conversations user owns rows"
  on hades_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_messages ─────────────────────────────────────────────
create table if not exists hades_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  conversation_id uuid not null references hades_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hades_messages_conversation_scope
  on hades_messages(user_id, tenant_id, conversation_id);

alter table hades_messages enable row level security;

create policy "hades_messages user owns rows"
  on hades_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_agent_executions ─────────────────────────────────────
create table if not exists hades_agent_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  provider text,
  trigger_type text,
  minion_id uuid,
  assignment_id uuid,
  status text not null,
  failure_code text,
  request_id text,
  input_summary text,
  output_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_agent_executions_user_tenant
  on hades_agent_executions(user_id, tenant_id);

alter table hades_agent_executions enable row level security;

create policy "hades_agent_executions user owns rows"
  on hades_agent_executions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_memory_records ───────────────────────────────────────
create table if not exists hades_memory_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  scope text not null default 'user',
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_memory_records_user_tenant
  on hades_memory_records(user_id, tenant_id);

alter table hades_memory_records enable row level security;

create policy "hades_memory_records user owns rows"
  on hades_memory_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_documents ────────────────────────────────────────────
create table if not exists hades_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  filename text not null,
  mime_type text,
  storage_path text,
  status text not null default 'uploaded',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_documents_user_tenant
  on hades_documents(user_id, tenant_id);

alter table hades_documents enable row level security;

create policy "hades_documents user owns rows"
  on hades_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_document_chunks ──────────────────────────────────────
create table if not exists hades_document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  document_id uuid not null references hades_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hades_document_chunks_document_scope
  on hades_document_chunks(user_id, tenant_id, document_id);

alter table hades_document_chunks enable row level security;

create policy "hades_document_chunks user owns rows"
  on hades_document_chunks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── hades_tool_results ─────────────────────────────────────────
create table if not exists hades_tool_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  tool_name text not null,
  status text not null,
  input_summary text,
  output_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hades_tool_results_user_tenant
  on hades_tool_results(user_id, tenant_id);

alter table hades_tool_results enable row level security;

create policy "hades_tool_results user owns rows"
  on hades_tool_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
