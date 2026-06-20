# Proxy execute (/docs/proxy-execute)

Proxy execute lets you call any HTTP endpoint on a supported toolkit using a [connected account](/docs/auth-configuration/connected-accounts). Composio injects the authentication (OAuth token, API key, basic auth, etc.) on the server side, so your code never handles raw credentials.

Use it when you need an endpoint that Composio's predefined tools do not cover, or when you want the flexibility of a raw HTTP call while keeping Composio as the source of truth for user auth.

> Proxy execute is a form of [direct tool execution](/docs/sessions-vs-direct-execution). It bypasses session state, tool schemas, and modifiers. If you are building an agent, prefer [sessions](/docs/configuring-sessions) — use the proxy only for the specific API call that isn't available as a tool.

# When to use proxy execute

## 1. Endpoints not covered by a predefined tool

You need a specific endpoint on a toolkit (for example, an unusual LinkedIn or Notion endpoint) that isn't exposed as a predefined Composio tool. Instead of extracting the raw OAuth token and making the call yourself, send the request through proxy execute and let Composio attach credentials.

**Python:**

```python
# Fetch the authenticated user's LinkedIn profile
response = composio.tools.proxy(
    endpoint="/v2/userinfo",
    method="GET",
    connected_account_id="ca_linkedin_user_123",
)

print(response["data"])
```

**TypeScript:**

```typescript
import { Composio } from '@composio/core';
const composio = new Composio({ apiKey: 'your_api_key' });
// Fetch the authenticated user's LinkedIn profile
const { data } = await composio.tools.proxyExecute({
  endpoint: '/v2/userinfo',
  method: 'GET',
  connectedAccountId: 'ca_linkedin_user_123',
});

console.log(data);
```

## 2. Request shapes a predefined tool cannot express

AI workflows that talk to Gmail, Drive, Sheets, Outlook, or Teams often need request shapes beyond the pre-built actions — custom query parameters, partial field masks, advanced filters. Proxy execute gives you the full HTTP surface of the upstream API while keeping auth managed by Composio.

**Python:**

```python
# Read a Google Sheet range with custom render options
response = composio.tools.proxy(
    endpoint="/v4/spreadsheets/1abc.../values/Sheet1!A1:D100",
    method="GET",
    connected_account_id="ca_googlesheets_user_123",
    parameters=[
        {"name": "valueRenderOption", "value": "UNFORMATTED_VALUE", "type": "query"},
        {"name": "dateTimeRenderOption", "value": "SERIAL_NUMBER", "type": "query"},
    ],
)

print(response["data"])
```

**TypeScript:**

```typescript
import { Composio } from '@composio/core';
const composio = new Composio({ apiKey: 'your_api_key' });
// Read a Google Sheet range with custom render options
const { data } = await composio.tools.proxyExecute({
  endpoint: '/v4/spreadsheets/1abc.../values/Sheet1!A1:D100',
  method: 'GET',
  connectedAccountId: 'ca_googlesheets_user_123',
  parameters: [
    { name: 'valueRenderOption', value: 'UNFORMATTED_VALUE', in: 'query' },
    { name: 'dateTimeRenderOption', value: 'SERIAL_NUMBER', in: 'query' },
  ],
});

console.log(data);
```

## 3. Terminal and CLI agents that would otherwise use raw tokens

Agents running in a terminal often fall back to `curl` calls with a hardcoded bearer token. Replacing that with a call to Composio's proxy endpoint keeps user credentials server-side — no tokens in shell history, env files, or process state.

```bash
curl --location 'https://backend.composio.dev/api/v3.1/tools/execute/proxy' \
  --header "x-api-key: $COMPOSIO_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "endpoint": "/user/repos",
    "method": "GET",
    "connected_account_id": "ca_github_user_123",
    "parameters": [
      { "name": "per_page", "value": "50", "type": "query" },
      { "name": "sort",     "value": "updated", "type": "query" }
    ]
  }'
```

# Quick start

**Python:**

```python
from composio import Composio

composio = Composio(api_key="your_api_key")

response = composio.tools.proxy(
    endpoint="/repos/composiohq/composio/issues/1",
    method="GET",
    connected_account_id="ca_github_user_123",
    parameters=[
        {"name": "Accept", "value": "application/vnd.github.v3+json", "type": "header"},
    ],
)

print(response["status"])
print(response["data"])
```

**TypeScript:**

```typescript
import { Composio } from '@composio/core';

const composio = new Composio({ apiKey: 'your_api_key' });

const { status, data } = await composio.tools.proxyExecute({
  endpoint: '/repos/composiohq/composio/issues/1',
  method: 'GET',
  connectedAccountId: 'ca_github_user_123',
  parameters: [
    { name: 'Accept', value: 'application/vnd.github.v3+json', in: 'header' },
  ],
});

console.log(status);
console.log(data);
```

The `endpoint` can be an **absolute URL** (`https://api.example.com/v1/resource`) or a **relative path** (`/v1/resource`). Relative paths are resolved against the toolkit's default base URL — only use the absolute form when calling a host that isn't the toolkit's standard API (for example, a regional Salesforce or Zendesk domain).

> Proxy execute rejects cross-domain requests. The `endpoint` must resolve to the same domain as the connected account's toolkit (for example, a GitHub connection can only call `api.github.com` paths). Pointing the proxy at an arbitrary third-party host will fail — this is an intentional security boundary, not a quota, so it cannot be bypassed by adjusting the request.

# Parameters

| Parameter                                     | Required | Type                                                        | Description                                                                                                                   |
| --------------------------------------------- | -------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `endpoint`                                    | Yes      | `string`                                                    | Absolute URL or path relative to the toolkit's base URL.                                                                      |
| `method`                                      | Yes      | `"GET" \| "POST" \| "PUT" \| "PATCH" \| "DELETE" \| "HEAD"` | HTTP verb.                                                                                                                    |
| `connected_account_id` / `connectedAccountId` | No       | `string`                                                    | Which connected account to use for auth. Defaults to the most recent active account for the project.                          |
| `body`                                        | No       | `object`                                                    | JSON request body. Used with `POST`, `PUT`, and `PATCH`.                                                                      |
| `parameters`                                  | No       | `Array<{ name, value, type }>`                              | Extra headers or query parameters. `type` is `"header"` or `"query"` (Python) / `in` is `"header"` or `"query"` (TypeScript). |
| `binary_body`                                 | No       | `{ url } \| { base64, content_type? }`                      | Binary upload payload. Either a URL to fetch or base64-encoded bytes (up to 4 MB).                                            |

The full schema is documented in the [POST /api/v3.1/tools/execute/proxy](/reference/api-reference/tools/postToolsExecuteProxy) reference.

## Response shape

```json
{
  "data": { /* parsed JSON body returned by the upstream API */ },
  "status": 200,
  "headers": { "content-type": "application/json", "...": "..." },
  "binary_data": {
    "url": "https://...",
    "content_type": "application/pdf",
    "size": 12345,
    "expires_at": "2026-01-01T00:00:00Z"
  }
}
```

`binary_data` is only present when the upstream API returns a binary response (PDFs, images, etc.). See [Binary data support](/docs/changelog/2025/12/30) for details.

# Common patterns

## GET with query parameters

**Python:**

```python
response = composio.tools.proxy(
    endpoint="/search/issues",
    method="GET",
    connected_account_id="ca_github_user_123",
    parameters=[
        {"name": "q", "value": "is:open label:bug repo:composiohq/composio", "type": "query"},
        {"name": "per_page", "value": "20", "type": "query"},
    ],
)
```

**TypeScript:**

```typescript
import { Composio } from '@composio/core';
const composio = new Composio({ apiKey: 'your_api_key' });
const { data } = await composio.tools.proxyExecute({
  endpoint: '/search/issues',
  method: 'GET',
  connectedAccountId: 'ca_github_user_123',
  parameters: [
    { name: 'q', value: 'is:open label:bug repo:composiohq/composio', in: 'query' },
    { name: 'per_page', value: '20', in: 'query' },
  ],
});
```

## POST with a JSON body

**Python:**

```python
response = composio.tools.proxy(
    endpoint="/repos/composiohq/composio/issues",
    method="POST",
    connected_account_id="ca_github_user_123",
    body={
        "title": "Found a bug",
        "body": "Steps to reproduce: ...",
        "labels": ["bug"],
    },
)
```

**TypeScript:**

```typescript
import { Composio } from '@composio/core';
const composio = new Composio({ apiKey: 'your_api_key' });
const { data } = await composio.tools.proxyExecute({
  endpoint: '/repos/composiohq/composio/issues',
  method: 'POST',
  connectedAccountId: 'ca_github_user_123',
  body: {
    title: 'Found a bug',
    body: 'Steps to reproduce: ...',
    labels: ['bug'],
  },
});
```

## Custom headers

Add vendor-specific headers (API versions, accept types, correlation IDs) via `parameters` with `type: "header"`.

**Python:**

```python
response = composio.tools.proxy(
    endpoint="/crm/v3/objects/contacts",
    method="GET",
    connected_account_id="ca_hubspot_user_123",
    parameters=[
        {"name": "Accept", "value": "application/json", "type": "header"},
        {"name": "X-Request-Id", "value": "req_abc123", "type": "header"},
        {"name": "limit", "value": "100", "type": "query"},
    ],
)
```

**TypeScript:**

```typescript
import { Composio } from '@composio/core';
const composio = new Composio({ apiKey: 'your_api_key' });
const { data } = await composio.tools.proxyExecute({
  endpoint: '/crm/v3/objects/contacts',
  method: 'GET',
  connectedAccountId: 'ca_hubspot_user_123',
  parameters: [
    { name: 'Accept', value: 'application/json', in: 'header' },
    { name: 'X-Request-Id', value: 'req_abc123', in: 'header' },
    { name: 'limit', value: '100', in: 'query' },
  ],
});
```

> Do not set the `Authorization` header yourself — Composio injects the correct one based on the connected account's auth scheme. Setting it manually will override Composio's credential and usually produces a `401`.

## Uploading a file

Use `binary_body` to upload binary content. You can point at a URL that Composio fetches server-side, or inline the bytes as base64.

```bash
curl --location 'https://backend.composio.dev/api/v3.1/tools/execute/proxy' \
  --header "x-api-key: $COMPOSIO_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "endpoint": "/upload",
    "method": "POST",
    "connected_account_id": "ca_abc123",
    "binary_body": { "url": "https://example.com/report.pdf" }
  }'
```

> `binary_body` posts the file as the request body with a single `Content-Type` header. It does **not** build a `multipart/form-data` payload, so APIs that require multipart uploads (for example, Twitter / X media upload, Slack `files.upload`, some Google upload endpoints) are not supported today. For those, wrap the call in a [session custom tool](/docs/toolkits/custom-tools-and-toolkits) that constructs the multipart body yourself.

See the [binary data changelog entry](/docs/changelog/2025/12/30) for the full upload and download flow.

# Error handling

Proxy execute forwards the upstream response verbatim — `status`, `headers`, and `data` reflect what the toolkit API returned. Check `status` and branch on the common failures.

| Status                  | Typical cause                                                                    | How to resolve                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400 Bad Request`       | Malformed endpoint path, invalid body, or unsupported `method`.                  | Check the upstream API docs for the expected request shape; proxy execute does not validate upstream schemas.                                                       |
| `401 Unauthorized`      | The connected account's token expired, was revoked, or is for the wrong project. | Re-authenticate the user, or [import fresh credentials](/docs/importing-existing-connections). Verify the `connected_account_id` belongs to the caller's project.   |
| `403 Forbidden`         | The user's OAuth scopes or API key permissions do not cover this endpoint.       | Update the [auth config scopes](/docs/auth-configuration/custom-auth-configs) and have the user re-consent. For API keys, regenerate with the required permissions. |
| `429 Too Many Requests` | Upstream rate limit (GitHub, Google, etc.).                                      | Honor the `Retry-After` header from the response, back off exponentially, and batch requests where possible. Composio does not retry automatically.                 |

# What to read next

- [API reference](/reference/api-reference/tools/postToolsExecuteProxy): Full request and response schema for POST /api/v3.1/tools/execute/proxy

- [Tools and toolkits](/docs/tools-and-toolkits): Understand how Composio tools are discovered and executed in sessions

- [Authentication](/docs/authentication): How Composio manages OAuth, API keys, and connected accounts

---

📚 **More documentation:** [View all docs](https://docs.composio.dev/llms.txt) | [Glossary](https://docs.composio.dev/llms.mdx/docs/glossary) | [Cookbooks](https://docs.composio.dev/llms.mdx/cookbooks) | [API Reference](https://docs.composio.dev/llms.mdx/reference)

---

# Composio SDK — Instructions for AI Code Generators

**Context:** This page documents the **direct tool execution API**. For most applications, the session-based pattern (`composio.create(user_id)` + `session.tools()`) is simpler — but if the user is here, they likely want direct execution.

---

## Key Patterns

### Authenticating Users

Create an **Auth Config** on [dashboard.composio.dev](https://dashboard.composio.dev), then use the auth config ID to generate a hosted auth URL:

```python
from composio import Composio

composio = Composio()
connection = composio.connected_accounts.link(
    user_id="user_123",
    auth_config_id="ac_...",  # from platform dashboard
)
print(connection.redirect_url)  # send user here to authenticate
```

```typescript
import { Composio } from "@composio/core";

const composio = new Composio();
const connection = await composio.connectedAccounts.link("user_123", "ac_...", {
    callbackUrl: "https://your-app.com/callback",
});
console.log(connection.redirectUrl); // send user here to authenticate
```

### Executing Tools

```python
tools = composio.tools.get("user_123", tools=["GITHUB_CREATE_ISSUE"])

result = composio.tools.execute(
    "GITHUB_CREATE_ISSUE",
    {"owner": "org", "repo": "repo", "title": "Bug report"},
    user_id="user_123",
)
```

```typescript
const tools = await composio.tools.get("user_123", { tools: ["GITHUB_CREATE_ISSUE"] });

const result = await composio.tools.execute("GITHUB_CREATE_ISSUE", {
    userId: "user_123",
    arguments: { owner: "org", repo: "repo", title: "Bug report" },
});
```

---

## Rules

1. **`user_id` is required** — pass it to `tools.get()`, `tools.execute()`, and `provider.handle_tool_calls()`.
2. **`tools.execute()` signature** — Python: `execute(slug, arguments_dict, *, user_id=...)` (arguments is the second positional param). TypeScript: `execute(slug, { userId, arguments })`.
3. **Provider at init** — `Composio(provider=OpenAIProvider())` in Python, `new Composio({ provider: new OpenAIProvider() })` in TypeScript. Defaults to OpenAI if omitted.
4. **Correct provider imports** — `composio_<provider>` for Python, `@composio/<provider>` for TypeScript. For OpenAI Agents SDK use `composio_openai_agents` / `@composio/openai-agents`.


---

## Terminology Migration (old → current)

If you encounter these terms in error messages, old documentation, or user prompts, translate them to the current equivalents. **Do not use the old terms in generated code or explanations.**

| Old term (v1/v2) | Current term (v3) | In code |
|---|---|---|
| entity ID | user ID | `user_id` parameter |
| actions | tools | e.g., `GITHUB_CREATE_ISSUE` is a *tool* |
| apps / appType | toolkits | e.g., `github` is a *toolkit* |
| integration / integration ID | auth config / auth config ID | `auth_config_id` parameter |
| connection | connected account | `connected_accounts` namespace |
| ComposioToolSet / OpenAIToolSet | `Composio` class with a provider | `Composio(provider=...)` |
| toolset | provider | e.g., `OpenAIProvider` |

If a user says "entity ID", they mean `user_id`. If they say "integration", they mean "auth config". Always respond using the current terminology.

