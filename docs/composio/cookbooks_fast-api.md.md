# Basic FastAPI Server (/cookbooks/fast-api)

[View source on GitHub](https://github.com/ComposioHQ/composio/tree/next/docs/examples/fast-api)

This cookbook builds a FastAPI server where users can chat with an AI agent that has access to over 1000 tools like Gmail, GitHub, Slack, Notion, and more. Along the way we'll add endpoints to manage which apps a user has connected.

# Prerequisites

* Python 3.10+
* [UV](https://docs.astral.sh/uv/getting-started/installation/)
* [Composio API key](https://dashboard.composio.dev/settings)
* [OpenAI API key](https://platform.openai.com/api-keys)

# Project setup

Create a new project and install dependencies:

```bash
mkdir composio-fastapi && cd composio-fastapi
uv init && uv add composio composio-openai-agents openai-agents fastapi uvicorn pydantic
```

Add your API keys to a `.env` file:

```bash title=".env"
COMPOSIO_API_KEY=your_composio_api_key
OPENAI_API_KEY=your_openai_api_key
```
# Initializing the clients

`Composio` takes an `OpenAIAgentsProvider` so that when we ask for tools later, they come back in the format the OpenAI Agents SDK expects.

```py
from agents import Agent, Runner
from composio import Composio
from composio_openai_agents import OpenAIAgentsProvider
from fastapi import FastAPI
from pydantic import BaseModel

composio = Composio(provider=OpenAIAgentsProvider())

app = FastAPI()
```
# Chat endpoint

The core of the server is a `/chat` endpoint. A user sends a message, and the agent responds, using whatever tools it needs.

`composio.create()` creates a **session** scoped to a user. Calling `session.tools()` returns a set of meta tools that let the agent discover tools across all apps, handle OAuth when needed, and execute actions. We pass these to an `Agent` and let `Runner.run_sync` handle the agentic loop.

```py
class ChatRequest(BaseModel):
    user_id: str
    message: str

@app.post("/chat")
def chat(request: ChatRequest):
    """Send a message to an AI agent with access to all tools."""
    session = composio.create(user_id=request.user_id)
    tools = session.tools()

    agent = Agent(
        name="Assistant",
        instructions="You are a helpful assistant. Use tools to help the user.",
        tools=tools,
    )

    result = Runner.run_sync(starting_agent=agent, input=request.message)
    return {"response": result.final_output}
```
> If the user hasn't connected the app they're trying to use, the agent will automatically
return an authentication link in its response. The user can complete OAuth and then retry.

That's a working agent. But in most apps you'll also want to manage connections outside of chat, for example to show users what's connected or let them connect new apps from a settings page.

# Checking connections

`session.toolkits()` returns every toolkit in the session along with its connection status. We can expose this as a simple GET endpoint so your frontend can render a connections UI.

```py
@app.get("/connections/{user_id}")
def list_connections(user_id: str):
    """List all toolkits and their connection status for a user."""
    session = composio.create(user_id=user_id)
    toolkits = session.toolkits()
    return [
        {"toolkit": t.slug, "connected": t.connection.is_active if t.connection else False}
        for t in toolkits.items
    ]
```
If you just need to check a single toolkit, say before kicking off a workflow that requires Gmail, you can scope the session to that toolkit:

```py
@app.get("/connections/{user_id}/{toolkit}")
def check_connection(user_id: str, toolkit: str):
    """Check if a specific toolkit is connected for a user."""
    session = composio.create(user_id=user_id, toolkits=[toolkit])
    toolkits = session.toolkits()
    for t in toolkits.items:
        if t.slug == toolkit:
            return {"toolkit": toolkit, "connected": t.connection.is_active if t.connection else False}
    return {"toolkit": toolkit, "connected": False}
```
# Connecting an app

When a user wants to connect a new app, `session.authorize()` starts the OAuth flow and returns a redirect URL. Your frontend sends the user there, and once they complete auth, they're connected.

```py
class ConnectRequest(BaseModel):
    user_id: str

@app.post("/connect/{toolkit}")
def connect_toolkit(toolkit: str, request: ConnectRequest):
    """Start OAuth for a toolkit. Returns a URL to redirect the user to."""
    session = composio.create(user_id=request.user_id, toolkits=[toolkit])
    connection_request = session.authorize(toolkit)
    return {"redirect_url": connection_request.redirect_url}
```
# Complete app

Here's everything together:

```py
# region setup
from agents import Agent, Runner
from composio import Composio
from composio_openai_agents import OpenAIAgentsProvider
from fastapi import FastAPI
from pydantic import BaseModel

composio = Composio(provider=OpenAIAgentsProvider())

app = FastAPI()
# endregion setup

# region chat
class ChatRequest(BaseModel):
    user_id: str
    message: str

@app.post("/chat")
def chat(request: ChatRequest):
    """Send a message to an AI agent with access to all tools."""
    session = composio.create(user_id=request.user_id)
    tools = session.tools()

    agent = Agent(
        name="Assistant",
        instructions="You are a helpful assistant. Use tools to help the user.",
        tools=tools,
    )

    result = Runner.run_sync(starting_agent=agent, input=request.message)
    return {"response": result.final_output}
# endregion chat

# region list-connections
@app.get("/connections/{user_id}")
def list_connections(user_id: str):
    """List all toolkits and their connection status for a user."""
    session = composio.create(user_id=user_id)
    toolkits = session.toolkits()
    return [
        {"toolkit": t.slug, "connected": t.connection.is_active if t.connection else False}
        for t in toolkits.items
    ]
# endregion list-connections

# region check-connection
@app.get("/connections/{user_id}/{toolkit}")
def check_connection(user_id: str, toolkit: str):
    """Check if a specific toolkit is connected for a user."""
    session = composio.create(user_id=user_id, toolkits=[toolkit])
    toolkits = session.toolkits()
    for t in toolkits.items:
        if t.slug == toolkit:
            return {"toolkit": toolkit, "connected": t.connection.is_active if t.connection else False}
    return {"toolkit": toolkit, "connected": False}
# endregion check-connection

# region connect
class ConnectRequest(BaseModel):
    user_id: str

@app.post("/connect/{toolkit}")
def connect_toolkit(toolkit: str, request: ConnectRequest):
    """Start OAuth for a toolkit. Returns a URL to redirect the user to."""
    session = composio.create(user_id=request.user_id, toolkits=[toolkit])
    connection_request = session.authorize(toolkit)
    return {"redirect_url": connection_request.redirect_url}
# endregion connect

```
# Running the server

```bash
uv run --env-file .env uvicorn main:app --reload
```
The server runs at `http://localhost:8000`. Visit `/docs` for the interactive Swagger UI.

# Testing with cURL

## Chat with the agent

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123", "message": "Star the composiohq/composio repo on GitHub"}'
```
## List all connections

```bash
curl http://localhost:8000/connections/user_123
```
## Check a specific connection

```bash
curl http://localhost:8000/connections/user_123/gmail
```
## Connect an app

```bash
curl -X POST http://localhost:8000/connect/gmail \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'
```

Open the `redirect_url` from the response in your browser to complete OAuth.

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

