-- ── hades_telegram_conversation_modes ──────────────────────────────────
-- Cross-instance persistent mode switching for Telegram conversations.
-- Each chat+user+tenant combination stores whether the conversation is
-- in "general" or "forge" mode.

create table if not exists hades_telegram_conversation_modes (
  chat_id text not null,
  user_id uuid not null,
  tenant_id uuid not null,
  mode text not null default 'general',
  updated_at timestamptz not null default now(),
  primary key (chat_id, user_id, tenant_id),
  check (mode in ('general', 'forge'))
);

create index if not exists idx_hades_telegram_conversation_modes_updated
  on hades_telegram_conversation_modes(updated_at);

alter table hades_telegram_conversation_modes enable row level security;

create policy "hades_telegram_conversation_modes user owns rows"
  on hades_telegram_conversation_modes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
