-- Hades OS — Add conversation_type to hades_conversations
-- Run if you already applied 001_hades_tables.sql without the context_type column.
-- If using 001_hades_tables.sql fresh, context_type is already included.

alter table hades_conversations
add column if not exists context_type text default 'general';

create index if not exists idx_hades_conversations_type
  on hades_conversations(user_id, tenant_id, context_type);
