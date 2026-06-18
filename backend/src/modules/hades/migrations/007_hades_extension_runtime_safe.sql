-- Safe version: drops policies before creating them.
create table if not exists hades_extension_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  name text,
  content_type text,
  size integer not null default 0,
  storage_key text,
  text_content text,
  created_at timestamptz not null default now()
);

create index if not exists idx_hades_extension_documents_user_tenant
  on hades_extension_documents(user_id, tenant_id);

alter table hades_extension_documents enable row level security;

drop policy if exists "hades_extension_documents user owns rows" on hades_extension_documents;
create policy "hades_extension_documents user owns rows"
  on hades_extension_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists hades_extension_context_spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  name text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tenant_id, name)
);

create index if not exists idx_hades_extension_context_spaces_user_tenant
  on hades_extension_context_spaces(user_id, tenant_id);

alter table hades_extension_context_spaces enable row level security;

drop policy if exists "hades_extension_context_spaces user owns rows" on hades_extension_context_spaces;
create policy "hades_extension_context_spaces user owns rows"
  on hades_extension_context_spaces for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists hades_extension_page_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  url text,
  title text,
  selected_text text,
  full_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_hades_extension_page_captures_user_tenant
  on hades_extension_page_captures(user_id, tenant_id);

alter table hades_extension_page_captures enable row level security;

drop policy if exists "hades_extension_page_captures user owns rows" on hades_extension_page_captures;
create policy "hades_extension_page_captures user owns rows"
  on hades_extension_page_captures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists hades_extension_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  action_type text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hades_extension_approvals_user_tenant
  on hades_extension_approvals(user_id, tenant_id);

create index if not exists idx_hades_extension_approvals_status
  on hades_extension_approvals(status);

alter table hades_extension_approvals enable row level security;

drop policy if exists "hades_extension_approvals user owns rows" on hades_extension_approvals;
create policy "hades_extension_approvals user owns rows"
  on hades_extension_approvals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
