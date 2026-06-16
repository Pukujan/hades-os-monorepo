Hades OS “Use Anywhere” Build Plan

Target

Hades OS now =
saved minions
+ callable minion runs
+ browser extension chat
+ Android floating overlay chat
+ same backend endpoint for all surfaces

Final principle:

Every surface is dumb.
Hades backend is source of truth.
Hermes does execution.

So the browser extension, phone overlay, Discord, Slack, Telegram, and Hades UI should all call the same backend run system.


---

1. Core Architecture

flowchart TD
  A[Hades UI] --> E[Hades API]
  B[Browser Extension] --> E
  C[Android Overlay] --> E
  D[Discord/Slack/Telegram Later] --> E

  E --> F[Minion Store]
  E --> G[Minion Run Store]
  E --> H[Hermes Runtime]
  H --> I[Model Provider / Tools]
  H --> J[Output / Logs / Artifacts]

The only required internal objects are:

Minion
MinionRun
RuntimeAdapter
SurfaceClient


---

2. MVP Scope

Build now

1. Save minions
2. List minions
3. Edit minions
4. Delete minions
5. Call minion
6. Store minion run
7. Show minion run history
8. Browser extension sends page/context to minion
9. Android overlay sends instruction to minion

Do not build yet

- GitHub PR automation
- Discord channel architecture
- Slack app
- Telegram bot
- live diff viewer
- custom log dashboard
- merge/deploy commands
- phone screen control
- full accessibility automation


---

3. Backend Data Model

minions

type Minion = {
  id: string;
  userId: string;

  name: string;
  description?: string;

  action: string;
  instructions: string;

  runtime: "hermes";
  modelProvider?: "openrouter" | "anthropic" | "openai" | "local";
  model?: string;

  allowedTools: string[];

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
};

Example:

{
  "name": "Frontend Fixer",
  "description": "Fixes UI bugs with tests",
  "action": "Fix the requested frontend issue",
  "instructions": "Inspect the provided context. Make the smallest safe change. Prefer tests first. Return summary, changed files, and errors.",
  "runtime": "hermes",
  "modelProvider": "openrouter",
  "model": "deepseek/deepseek-chat",
  "allowedTools": ["read_context", "write_output"]
}


---

minion_runs

type MinionRun = {
  id: string;
  userId: string;
  minionId: string;

  source:
    | "hades-ui"
    | "browser-extension"
    | "android-overlay"
    | "discord"
    | "slack"
    | "telegram"
    | "api";

  input: string;

  context?: {
    pageUrl?: string;
    pageTitle?: string;
    selectedText?: string;
    appName?: string;
    screenshotText?: string;
    files?: string[];
    metadata?: Record<string, unknown>;
  };

  status: "queued" | "running" | "completed" | "failed" | "cancelled";

  output?: string;
  error?: string;
  logs?: string[];

  startedAt?: string;
  completedAt?: string;

  createdAt: string;
};


---

4. Backend API Contract

Minion CRUD

POST /api/minions
GET /api/minions
GET /api/minions/:id
PATCH /api/minions/:id
DELETE /api/minions/:id

Run minion

POST /api/minions/:id/runs

Request:

{
  "source": "browser-extension",
  "input": "Summarize this page and tell me what action to take.",
  "context": {
    "pageUrl": "https://example.com",
    "pageTitle": "Example Page",
    "selectedText": "..."
  }
}

Response:

{
  "runId": "run_123",
  "status": "completed",
  "output": "Here is the summary..."
}

Run history

GET /api/minion-runs
GET /api/minion-runs/:runId
GET /api/minions/:id/runs


---

5. Hermes Runtime Contract

Hades should not make every client know Hermes.

The backend should transform a minion run into a Hermes prompt.

type HermesExecutionInput = {
  minionName: string;
  action: string;
  instructions: string;
  userInput: string;
  context?: Record<string, unknown>;
  allowedTools: string[];
};

Prompt shape:

You are executing a Hades minion.

Minion:
{name}

Action:
{action}

Instructions:
{instructions}

Allowed tools:
{allowedTools}

User request:
{input}

Context:
{context}

Return:
- direct answer
- errors if any
- next action if needed

Backend calls:

hermes --oneshot "<compiled prompt>"

or whatever Railway Hermes endpoint/CLI wrapper you already have.


---

6. Backend Service Structure

Keep current backend if it works. Do not migrate to NestJS before this MVP.

Recommended folders:

server/
  modules/
    minions/
      minions.routes.js
      minions.service.js
      minions.repository.js
      minions.validators.js
      minions.test.js

    minion-runs/
      minionRuns.routes.js
      minionRuns.service.js
      minionRuns.repository.js
      minionRuns.test.js

    hermes/
      hermesRuntime.service.js
      hermesPromptBuilder.js
      hermesRuntime.test.js

    auth/
      requireAuth.js


---

7. Execution Flow

User calls minion
→ API validates auth
→ API loads minion
→ API creates minion_run status=queued
→ API marks status=running
→ API builds Hermes prompt
→ Hermes executes
→ API stores output/logs/error
→ API marks completed/failed
→ API returns result

For MVP, synchronous is okay.

Later, queue it.

MVP:
request waits for Hermes result

Later:
request creates run
worker processes run
client polls /runs/:id


---

8. Hades UI Plan

Add a simple Minions page and Run Minion panel.

Minions page

- list saved minions
- create minion
- edit minion
- delete minion
- test run button

Minion detail page

Fields:
- name
- description
- action
- instructions
- model/provider
- allowed tools
- active/inactive

Run panel

- choose minion
- input box
- optional context textarea
- run button
- output area
- recent runs

Do not over-design this yet.


---

9. Browser Extension Plan

Goal

Use Hades from any browser page.

Select text on webpage
→ open Hades extension
→ choose minion
→ send instruction + selected context
→ get answer

Browser extension components

manifest.json
background service worker
content script
popup UI
side panel UI optional
auth/token storage
Hades API client

MVP extension features

1. Save Hades API URL
2. Save user auth token
3. Floating button or extension popup
4. Capture selected text
5. Capture current URL/title
6. Choose minion
7. Send run request
8. Show output

Extension request

{
  "source": "browser-extension",
  "input": "Explain this and tell me what to do next.",
  "context": {
    "pageUrl": "https://...",
    "pageTitle": "...",
    "selectedText": "..."
  }
}

Extension permissions

Start minimal:

{
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["https://your-hades-api.railway.app/*"]
}

Avoid broad permissions at first.


---

10. Android Overlay Plan

Goal

Use Hades above any app.

Floating bubble
→ tap
→ mini chat opens
→ type/speak instruction
→ choose minion
→ send to Hades
→ show response

Android MVP features

1. Login/API token screen
2. Enable overlay permission
3. Floating Hades bubble
4. Mini chat window
5. Minion selector
6. Text input
7. Voice input optional
8. Send to Hades API
9. Show response/errors

Android permissions

SYSTEM_ALERT_WINDOW
FOREGROUND_SERVICE
POST_NOTIFICATIONS
RECORD_AUDIO only if voice input

Avoid Accessibility permission in v1.

That means v1 does not read the screen automatically. User manually types or pastes context.

Android architecture

MainActivity
OverlayService
HadesBubbleView
MiniChatView
HadesApiClient
TokenStore
MinionRepositoryClient

Android flow

Open app
→ login / paste API token
→ grant overlay permission
→ start foreground service
→ bubble appears
→ user taps bubble
→ mini chat opens
→ user sends instruction
→ response displayed


---

11. iOS Reality

True phone overlay above every app is not realistic on iOS.

iOS alternatives:

- Share Sheet extension
- Safari extension
- Shortcuts action
- Keyboard extension
- Widget

For now:

Android overlay first.
iOS Share Sheet later.


---

12. Security Rules

Minimum safety rules:

- Every request requires auth
- Every minion belongs to userId
- Extension token stored locally only
- Android token stored securely
- No arbitrary shell execution from extension/overlay
- No auto GitHub push from minion chat
- No screen reading without explicit future permission
- Logs should not expose tokens
- Rate limit minion runs per user

Recommended limits:

MAX_INPUT_CHARS=12000
MAX_CONTEXT_CHARS=30000
MAX_RUN_SECONDS=120
MAX_RUNS_PER_MINUTE=5
MAX_RUNS_PER_DAY=200


---

13. Testing Plan

Backend red tests first

Minions

- cannot create minion without auth
- can create minion with required fields
- rejects missing name
- rejects missing action
- rejects missing instructions
- user cannot see another user's minions
- user can update own minion
- user cannot update another user's minion
- soft/hard delete works

Minion runs

- cannot run minion without auth
- cannot run another user's minion
- creates run record before Hermes execution
- stores completed output
- stores failed error
- passes source into run record
- passes context into Hermes prompt
- validates source enum

Hermes runtime

- builds prompt from minion action/instructions/input/context
- does not include undefined/null garbage
- handles Hermes timeout
- handles Hermes nonzero exit
- returns stdout as output
- returns stderr as error/log

Extension API compatibility

- accepts browser-extension source
- accepts selectedText/pageUrl/pageTitle context
- rejects oversized selectedText

Android API compatibility

- accepts android-overlay source
- accepts appName/manual context
- does not require pageUrl


---

14. Build Phases

Phase 1 — Backend minion spine

Goal:
Minions can be saved and called from Hades UI.

Tasks:
- create minions repository
- create minions service
- create minions routes
- create minion runs repository
- create minion runs service
- wire Hermes runtime
- add backend tests

Done when:

I can create a minion in Hades UI and run it.
The run is saved.
The output appears.
The run history exists.


---

Phase 2 — Simple Hades UI

Goal:
Use minions from the web app.

Tasks:
- Minions list
- Create/edit form
- Run minion panel
- Recent runs
- Output display

Done when:

User can save a minion, call it, and see the answer without touching backend manually.


---

Phase 3 — Browser extension

Goal:
Use Hades from any webpage.

Tasks:
- extension auth config
- fetch minions
- capture selected text
- send run request
- display output

Done when:

User can highlight text on GitHub/docs/website and ask a Hades minion about it.


---

Phase 4 — Android overlay

Goal:
Use Hades above any Android app.

Tasks:
- Android app shell
- overlay permission
- foreground overlay service
- floating bubble
- mini chat UI
- Hades API client
- minion selector
- send run request

Done when:

User can tap floating Hades bubble over any app and send a minion instruction.


---

Phase 5 — External chat surfaces

Later only.

Discord
Telegram
Slack

All call:

POST /api/minions/:id/runs

Do not create separate logic per platform.


---

15. Suggested MVP Naming

Use simple names:

Minions = saved agents
Runs = executions
Surfaces = where the run came from
Hermes = runtime

Product wording:

Save a minion.
Call it from anywhere.
Hades routes it to Hermes.


---

16. What Not To Do Yet

Avoid these until minion calling works:

- NestJS migration
- AWS migration
- Azure migration
- custom PR dashboard
- coding branch automation
- multi-channel Discord server
- advanced phone screen reading
- background autonomous action
- queue scaling

Those are good later, but they will slow the actual MVP.


---

17. Final Build Order

1. Backend minion CRUD
2. Backend minion run/call
3. Hades UI minion page
4. Hades UI run history
5. Browser extension
6. Android overlay
7. Discord/Telegram/Slack thin clients
8. Coding tab
9. GitHub branch/PR automation
10. AWS/Azure portability

The correct immediate focus is:

Minion save + minion call.
Everything else becomes easy after that.
