-- Safe version: drops policies before creating them.
create table if not exists hades_instagram_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  external_connection_id text not null,
  instagram_business_account_id text,
  handle text,
  connector text not null default 'composio',
  status text not null default 'connected',
  capabilities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tenant_id)
);

create index if not exists idx_hades_instagram_connections_user_tenant
  on hades_instagram_connections(user_id, tenant_id);

create index if not exists idx_hades_instagram_connections_external
  on hades_instagram_connections(external_connection_id);

alter table hades_instagram_connections enable row level security;

drop policy if exists "hades_instagram_connections user owns rows" on hades_instagram_connections;
create policy "hades_instagram_connections user owns rows"
  on hades_instagram_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
