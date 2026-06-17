-- Hades OS — Extension API keys for programmatic access
-- Each key is stored as a SHA-256 hash (never plaintext).
-- The plaintext key (hx_...) is returned once at creation time.

create table if not exists hades_extension_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  name text not null default 'Unnamed key',
  scopes jsonb not null default '[]'::jsonb,
  key_hash text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_hades_extension_keys_key_hash
  on hades_extension_keys(key_hash);

create index if not exists idx_hades_extension_keys_user_tenant
  on hades_extension_keys(user_id, tenant_id);

alter table hades_extension_keys enable row level security;

create policy "hades_extension_keys user owns rows"
  on hades_extension_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
