# Publishing the v2 CLI

Publish as **`@pukujan/create-modular-monolith`** — users scaffold with:

```bash
npm create @pukujan/modular-monolith@2 my-platform
```

## One-time setup

1. [npm account](https://www.npmjs.com/signup) and `npm login`
2. Ensure you can publish scope **`@pukujan`** (org or user on npm)

## Release flow

On branch **`v2`**:

**Architecture-only** (no domain modules — recommended for boilerplate updates):

```bash
# Review local output (gitignored): file-exchange/exports/architecture-starter/
npm run export:architecture-starter -- --to /absolute/path/to/create-modular-monolith/template
```

Starter patch sources live in `file-exchange/exports/templates/` (committed).

**Full repo copy** (legacy — includes all modules):

```bash
npm run sync:cli-template
```

Then bump version and publish:

```bash
cd packages/create-modular-monolith
npm publish --access public
```

## Package identity

| Field | Value |
| --- | --- |
| npm name | `@pukujan/create-modular-monolith` |
| bin | `create-modular-monolith` |
| user command | `npm create @pukujan/modular-monolith@2 <folder>` |
| major pin | `@2` = platform starter line |

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Minimal v1 modular shell |
| `v2` | Full internal contract + CLI |
