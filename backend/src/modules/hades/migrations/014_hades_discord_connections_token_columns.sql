alter table hades_discord_connections
  add column if not exists encrypted_bot_token text,
  add column if not exists token_last4 text,
  add column if not exists bot_username text;

-- Backfill: existing rows with discord_username get bot_username
update hades_discord_connections set bot_username = discord_username
  where bot_username is null and discord_username is not null;
