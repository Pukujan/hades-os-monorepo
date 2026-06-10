# Contract: API documentation registry

**Version:** `v001`  
**Registry:** [docs/API.md](../../API.md)  
**Lint:** `npm run lint:api-docs` (`scripts/check-api-docs.mjs`)  
**Dev-log inventory:** `scripts/lib/api-inventory.mjs`

## Purpose

Single **endpoint registry** for all mounted Express routes. Pre-push dev logs and agents read this for active / stub / deprecated HTTP surfaces.

## Registry sections (docs/API.md)

| Section | Use |
|---------|-----|
| **Endpoint registry** | Method, full path, module, description |
| **Module index** | Active vs stub modules |

## Route classification (dev-log / agents)

| Class | Rule |
|-------|------|
| **active** | Documented route, not stub/deprecated in description |
| **stub** | Description contains `stub` or `health only` |
| **deprecated** | Description contains `deprecated` |

Do not remove deprecated rows from the registry until the route is removed from code ([API_DOCUMENTATION_CONTRACT.md](../API_DOCUMENTATION_CONTRACT.md)).

## Versioned surfaces (not HTTP)

Captured in dev-log `apis.versioned` from:

- `backend/src/modules/case-filing-ai/contracts/pipelineVersions.js`
- `backend/src/modules/case-filing-ai/prompts/promptVersions.js`
- `MASTER_PROMPT_VERSION` env (`v1` \| `compact` \| `v2` \| `v001`)

## Related

- [API_DOCUMENTATION_CONTRACT.md](../API_DOCUMENTATION_CONTRACT.md)
- [prePushDevLog.contract.md](./prePushDevLog.contract.md)
