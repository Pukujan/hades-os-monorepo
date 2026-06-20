# Creating triggers (/docs/setting-up-triggers/creating-triggers)

Create a trigger to start receiving events. A trigger watches for a specific event (e.g., `GITHUB_COMMIT_EVENT`) on a specific user's connected account. For an overview of how triggers work, see [Triggers](/docs/triggers).

> **Prerequisites**: * An [auth config](/docs/authentication#how-composio-manages-authentication) for the toolkit you want to monitor
  * A connected account for the user whose events you want to capture
  * A [webhook subscription](/docs/setting-up-triggers/subscribing-to-events) on the project, so events have somewhere to land

You can create triggers using the [SDK](#using-the-sdk) or the Composio [dashboard](#using-the-dashboard). Some webhook triggers also need a webhook endpoint configured first — covered in [Configuring the webhook endpoint](#configuring-the-webhook-endpoint) below.

# Configuring the webhook endpoint

Some webhook triggers require a webhook endpoint registered with the provider before they can fire. With Composio-managed OAuth, this is already done for you. You only run the steps below when you bring your own OAuth app and the trigger type's `requires_webhook_endpoint_setup` flag is `true`.

Each OAuth app you bring gets its own ingress URL within a project:

```
https://backend.composio.dev/api/v3.1/webhook_ingress/{toolkit_slug}/{we_xxx}/trigger_event
```

A single OAuth app can serve at most one Composio project: providers accept only one callback URL per OAuth app, and each ingress URL routes to a single project. In return, every project becomes its own webhook tenant — with:

* **Its own ingress rate limit and backpressure budget**
* **Project-scoped credentials** — the signing secret and app-level token you provide are stored against this project alone, never shared across projects. Repeat verification handshakes are rejected after the endpoint is verified, so the signing secret can't be silently swapped by a forged challenge.
* **Clean fan-out** — events reach only that project's trigger instances
* **Per-project metering**

Every inbound event is signature-checked at ingress before any trigger fires:

* **HMAC-SHA256** for Slack, **Ed25519** or shared-token matching for other providers
* **Timestamp replay protection** — when the provider signs a request timestamp, requests outside the allowed skew window are rejected
* **Unsigned or tampered requests** are rejected with `400` at ingress, so third parties can't spoof events onto your triggers

> **Sharing one OAuth app across projects?** Consolidate to a single project or register separate OAuth apps per project before continuing.

The walkthrough below uses Slack as the example and walks through the [Webhook Endpoints API](/reference/api-reference/webhook-endpoints). For setup notes specific to each toolkit, see its FAQ section — e.g., [Slack](/toolkits/slack), [Notion](/toolkits/notion).

## Step 1: Discover what credentials the endpoint needs

Call the schema endpoint for the toolkit. The `setup_fields` in the response tell you exactly what to collect from the provider's app dashboard.

```bash
curl "https://backend.composio.dev/api/v3.1/webhook_endpoints/schema?toolkit_slug=slack" \
  -H "x-api-key: 

# What to read next

- [Subscribing to events](/docs/setting-up-triggers/subscribing-to-events): Set up the webhook subscription URL Composio delivers events to

- [Verifying webhooks](/docs/webhook-verification): Validate webhook signatures so you know payloads came from Composio

- [Managing triggers](/docs/setting-up-triggers/managing-triggers): List, enable, disable, and delete trigger instances

---

📚 **More documentation:** [View all docs](https://docs.composio.dev/llms.txt) | [Glossary](https://docs.composio.dev/llms.mdx/docs/glossary) | [Cookbooks](https://docs.composio.dev/llms.mdx/cookbooks) | [API Reference](https://docs.composio.dev/llms.mdx/reference)

---

# Composio SDK — Instructions for AI Code Generators

**Purpose:** Enforce only the **current** and **correct** patterns for integrating [Composio](https://composio.dev/) tools into AI agents.
**Scope:** All AI-generated code using Composio must follow these guardrails.

---

## 1. Correct Composio Integration

Composio supports two integration modes: **Native Tools** (with a provider package) and **MCP** (no provider package needed).

### Native Tools

```python
# ✅ CORRECT — Python (defaults to OpenAI)
from composio import Composio

composio = Composio()
session = composio.create(user_id="user_123")
tools = session.tools()
# Pass tools to your agent/LLM framework
```

```typescript
// ✅ CORRECT — TypeScript (defaults to OpenAI)
import { Composio } from "@composio/core";

const composio = new Composio();
const session = await composio.create("user_123");
const tools = await session.tools();
// Pass tools to your agent/LLM framework
```

For other providers, pass the provider explicitly. Provider packages follow the naming convention: `composio_<provider>` for Python, `@composio/<provider>` for TypeScript.

### MCP

Use `session.mcp.url` and `session.mcp.headers` with any MCP-compatible client (Claude Desktop, Cursor, OpenAI Agents, etc.). No provider package needed.

---

## 2. CRITICAL INSTRUCTIONS FOR AI MODELS

### 2.1 — ALWAYS DO THE FOLLOWING

1. **Use `composio.create(user_id)`** to create a session — this is the entry point for all Composio integrations.
2. **Use `session.tools()`** for native tool integration or **`session.mcp.url`** for MCP integration.
3. **Import** from the correct provider package (`composio_<provider>` for Python, `@composio/<provider>` for TypeScript).
4. **Pass `user_id` to `composio.create()`**, not to individual tool calls.

### 2.2 — NEVER DO THE FOLLOWING

1. **Do not** instruct users to manually create auth configs or connected accounts before running.
2. **Do not** import from `composio_openai` / `@composio/openai` when using OpenAI Agents SDK — use `composio_openai_agents` / `@composio/openai-agents` instead.

### 2.3 — DISCOURAGED (do not use unless user explicitly asks)

Do **not** generate `composio.tools.get()`, `composio.tools.execute()`, or `composio.provider.handle_tool_calls()` unless the user explicitly requests direct tool execution. These are a supported but **not recommended** low-level interface.


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

