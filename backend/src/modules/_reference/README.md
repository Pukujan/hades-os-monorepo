# Reference (example module)

**Not loaded at runtime** — folder name starts with `_`. Copy patterns from here or use `npm run new:module`.

See [Module internal contract](../../../docs/architecture/MODULE_INTERNAL_CONTRACT.md).

## Layout

`routes` → `services` → `repositories` / `domain` / `adapters`

`prompts` + `evals` for AI workflows. `tests/` for unit and integration coverage.
