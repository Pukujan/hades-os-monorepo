# Push (agent)

When the user asks to **push**, **commit and push**, or similar — run this full workflow in one turn. Do **not** run bare `git push`.

## Workflow

1. Pick a slug from the work topic (kebab-case), e.g. `planning-folder-move`.

2. **Create dev logs** (if missing):
   ```bash
   npm run agent:push -- --slug <slug>
   ```
   If exit code `2`, skeletons were created — continue to step 3.

3. **Fill** every `FILL` section in the new pair:
   - `work-log/dev-logs/agent/*_dev-log-agent_*.json`
   - `work-log/dev-logs/human/*_dev-log_*.md`
   Add rows to `work-log/INDEX.md` if new files.

4. **Commit dev logs and push**:
   ```bash
   npm run agent:push -- --slug <slug> --commit
   ```
   Pass remote/branch after `--` if needed, e.g. `-- origin main`.

## Rules

- Never skip dev logs when the user asked you to push.
- Never ask the user to click Push in the UI to bypass this.
- Terminal push by the user (without you running shell) is their choice — your job is to use `npm run agent:push`.

See `.agents/commands/pre-push-dev-log.md` for field-level fill guidance.
