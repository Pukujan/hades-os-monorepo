# Architecture push log (npm / create-modular-monolith)

Create **two** logs before pushing an architecture export — separate from product `dev-log:pre-push`.

## When

- After `npm run export:architecture-starter -- --to …/create-modular-monolith/template`
- Before git push to [create-modular-monolith](https://github.com/Pukujan/create-modular-monolith) and `npm publish`

## Steps

1. **Generate pair** (auto-fills UTC label, git, starter paths, lint gates):
   ```bash
   npm run arch-log:push -- --slug <kebab-topic> --npm-version <semver>
   ```
   Optional: `--export-to /absolute/path/to/template` `--seq 003` `--no-lint`

2. **Fill agent JSON** (`work-log/architecture-push-logs/agent/*_arch-push-agent_*.json`):
   - `summary`, `changes.narrative`, `decisions[]`, `followUps`
   - Confirm `architecturePush.npmVersion` and export target

3. **Fill human MD** (`work-log/architecture-push-logs/human/*_arch-push_*.md`):
   - Section IV narrative, risks, follow-up checkboxes

4. **Index** — add row to `work-log/INDEX.md` under Architecture push logs

5. **Verify**
   ```bash
   npm run arch-log:verify
   ```

## Do not

- Use `dev-log:pre-push` alone for npm template-only pushes (use both if the same session also ships product code)
- Skip logging when only bumping create-modular-monolith without product repo changes

See [architecturePushDevLog.contract.md](../../docs/architecture/contracts/architecturePushDevLog.contract.md).
