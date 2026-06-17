# OpenCode Handoff: Social Command Routing + Minion v2 Cleanup

## Metadata

- `task`: `hades-social-command-routing-and-minion-v2-cleanup`
- `branch`: `master`
- `dependsOn`: `013_2026-06-17_00-10_handoff_hades-conversational-minion-flow.md`
- `goal`: finish the new conversational minion model across social routing, metadata/versioning, and Forge UI
- `tdd`: `required`
- `status`: `ready`

## Product Intent

Forge is now a helper/editor, not the only place minions can be created. General chat, Forge chat, Telegram, Discord, and minion detail should all speak the same model:

- a minion is created from a useful request
- missing fields are inferred wherever safe
- Forge helps refine or edit, but does not gate creation
- social commands like `/sendcat` and `!sendcat` should resolve to the same saved minion
- minions carry version/metadata so later updates can be tracked

## Red Tests To Keep

- Telegram executes `/sendcat` when the saved minion command is `!sendcat`.
- Discord normalizes `/sendcat` to `!sendcat` before sending the command into Hermes.
- Saving a minion stores `schema_version`, `version`, and `metadata`.
- Forge draft controls show trigger-specific labels instead of old manual/automatic wording.
- Forge edit mode uses update labels, while create mode uses save labels.

## Implementation Tasks

- Extract social command normalization into a small shared backend helper.
- Use that helper in Telegram minion matching.
- Use that helper in Discord command names sent to Hermes and persisted in execution logs.
- Keep the clickable action protocol unchanged.
- Add metadata/version fields to scoped and memory minion saves.
- Make Forge show the current trigger as `Command`, `Manual`, or `Watcher`.
- Put direct Test and Save/Update controls in the active Forge draft panel.
- Treat old create/edit UI as migrated, not preserved as a parallel path.

## Acceptance

- Focused social routing tests pass.
- Focused metadata tests pass.
- Focused Forge UI helper tests pass.
- Existing Telegram runtime tests still pass.
- Existing Discord bot runtime contract still passes.
- Frontend build still passes.

