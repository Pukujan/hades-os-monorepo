# Model condenser — HTTP API

**Base path:** `/api/model-condenser`

Scans the repo and writes a **schema inventory** (`consolidated-files/consolidated-models.json`). This is unrelated to case eval reports or `eval-bundles/`.

**Routes:** [`backend/src/modules/model-condenser/routes/modelCondenser.routes.js`](../../backend/src/modules/model-condenser/routes/modelCondenser.routes.js)

**Contract:** [API documentation contract](../architecture/API_DOCUMENTATION_CONTRACT.md)

---

## Endpoint quick reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Module health |
| POST | `/condense` | Regenerate consolidated-models.json |
| GET | `/consolidated` | Read consolidated schema inventory |

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Module health |

---

## Condense

### `POST /condense`

Regenerate `consolidated-files/consolidated-models.json` from repo sources.

**Body (JSON, optional):**

```json
{ "includePayload": false }
```

| Field | Default | Description |
|-------|---------|-------------|
| `includePayload` | `false` | If `true`, include full consolidated document in response |

**Response 201:**

```json
{
  "status": "written",
  "outputPath": "/abs/path/consolidated-files/consolidated-models.json",
  "outputRelativePath": "consolidated-files/consolidated-models.json",
  "modelCount": 42,
  "exampleInstanceCount": 10,
  "generatedAt": "2026-05-23T..."
}
```

**CLI equivalent:** `npm run condense-models` (from `backend/`)

---

## Read consolidated file

### `GET /consolidated`

**Query:**

| Param | Description |
|-------|-------------|
| `includePayload=true` | Return full `consolidated` object in addition to summary |

**Response 200 (summary):**

```json
{
  "status": "ready | missing",
  "exists": true,
  "outputPath": "...",
  "outputRelativePath": "consolidated-files/consolidated-models.json",
  "generatedAt": "...",
  "modelCount": 42
}
```

**404** if file missing — run `POST /condense` first.

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MODEL_CONDENSER_OUTPUT_DIR` | `{repo}/models` | Output directory |
| `MODEL_CONDENSER_OUTPUT_FILE` | `consolidated-models.json` | Output filename |

---

## Tests

`backend/src/modules/model-condenser/tests/integration/modelCondenser.routes.test.js`
