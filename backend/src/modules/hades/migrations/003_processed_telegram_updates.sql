-- ── hades_processed_telegram_updates ──────────────────────────────────
-- Cross-instance deduplication for Telegram webhook updates.
-- Each instance checks/inserts here so duplicate update_ids across
-- Railway replicas are recognized as already processed.

create table if not exists hades_processed_telegram_updates (
  id bigint not null,                          -- Telegram update_id
  user_id uuid not null,
  tenant_id uuid not null,
  bot_username text,
  processed_at timestamptz not null default now(),
  primary key (id, user_id, tenant_id)
);

create index if not exists idx_hades_processed_telegram_updates_cleanup
  on hades_processed_telegram_updates(processed_at);

alter table hades_processed_telegram_updates enable row level security;

create policy "hades_processed_telegram_updates user owns rows"
  on hades_processed_telegram_updates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
