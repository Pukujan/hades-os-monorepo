# Document persistence — implementation guide

Copy these templates when you add runtime upload + database storage. The contract spec is [documentPersistence.contract.md](../../contracts/documentPersistence.contract.md).

## Quick start

```bash
npm run new:module -- documents --label "Documents"
cp docs/architecture/templates/document-persistence/migrations/001_document_persistence.sql \
   backend/src/modules/documents/repositories/migrations/
```

Then copy each `*.template.js` into the matching folder under `backend/src/modules/documents/`, rename to drop `.template`, and fill in TODOs.

## Files in this folder

| Template | Target in your module |
|----------|------------------------|
| `migrations/001_document_persistence.sql` | `repositories/migrations/` |
| `adapters/file-storage.adapter.template.js` | `adapters/file-storage.adapter.js` |
| `adapters/parser.adapter.template.js` | `adapters/parser.adapter.js` |
| `repositories/document.repository.template.js` | `repositories/document.repository.js` |
| `services/document-ingest.service.template.js` | `services/document-ingest.service.js` |
| `routes/upload.routes.template.js` | merge into `routes/` |

## Wiring checklist

1. Set `DATABASE_URL` in `backend/.env`.
2. Run migration against your database.
3. In `index.js`, create repository + adapters + service; pass to router factory.
4. Mount router at `/api/documents` (or your module name).
5. Emit `DOCUMENT_EVENTS` from the service after DB commit.
6. Document routes in `docs/documents/API.md` and `docs/API.md`.
7. `npm run lint:architecture` · `npm run test:ci`.

## What not to do

- Do **not** send user uploads through `file-exchange/imports`.
- Do **not** import another module's repository — use HTTP or `eventBus`.
- Do **not** put SQL in routes or adapters.

## Domain types

Map DB rows to JSDoc types in `backend/src/shared/domain/case-filing/core-models.js`:

- `DocumentModel` → `documents` table
- `DocumentTextVersionModel` → `document_text_versions` table
- `CaseModel`, `TaskModel`, `CaseStateSnapshotModel` → optional tables in migration
