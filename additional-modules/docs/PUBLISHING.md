# Publishing

Two npm packages ship from this repo on **different branches**.

## Packages

| npm name | Branch | User command |
|----------|--------|----------------|
| `@pukujan/create-modular-monolith` | `main` | `npm create @pukujan/modular-monolith@latest my-app` |
| `@pukujan/context-engineering` | `context-engineering` | `npx @pukujan/context-engineering init` |

## One-time setup

1. [npm account](https://www.npmjs.com/signup) and `npm login`
2. Access to publish scope **`@pukujan`**

## Publish `@pukujan/create-modular-monolith` (main)

```bash
git checkout main
# bump version in package.json, commit
npm pack --dry-run   # preview tarball
npm publish --access public
git push origin main
```

**Ships:** `index.js`, `template/`, `additional-modules/` (context-engineering, phase-builder, docs, scripts), `scripts/postinstall-message.mjs`

**Does not ship:** root `AGENTS.md`, `MEMORY.md` (maintainer workspace only)

## Publish `@pukujan/context-engineering` (context-engineering)

```bash
git checkout context-engineering
# bump version in package.json, commit
npm pack --dry-run
npm publish --access public
git push origin context-engineering
```

**Ships:** `additional-modules/buildplan/`, `context-engineering/`, `phase-builder/`, `work-log/` only — no Express/React template, no architecture contracts.

**Init writes to project root:** `buildplan/`, `scripts/`, `work-log/`, `AGENTS.md`, `MEMORY.md`

Optional addon: `context-engineering init --phase-builder` → `phase_builder/`

## Version policy

- **create-modular-monolith `2.x`** — platform scaffold line (breaking when template layout or default modules change)
- **context-engineering `2.x`** — standalone memory package (paths at project root)
