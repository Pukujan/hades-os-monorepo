# Hades API

## Endpoint quick reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/readiness` | Hades service readiness check |
| GET | `/bootstrap` | Bootstrap data for frontend hydration |
| POST | `/chat` | Send a chat message to Hermes for processing |
| POST | `/minions/test` | Run a test of the current minion draft |
| POST | `/minions` | Save a new minion |
| POST | `/assignments` | Assign a minion to a social channel |
| POST | `/triggers` | Handle an incoming social trigger (Discord, Telegram, etc.) |
| DELETE | `/conversations/:id/messages` | Clear all messages from a conversation |
