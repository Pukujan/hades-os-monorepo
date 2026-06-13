# TDD Test Plan: Post-Login UX v4 Visual Alignment

## Metadata

- Date: 2026-06-13
- Phase: 008
- Test owner: Codex 5.4 mini
- Strategy: write red frontend contract tests before visual implementation.

## Existing Commands

```bash
npm --prefix frontend test
npm --prefix frontend run build
npm run test:discord-login-bot-contracts
npm run test:hades-runtime-contracts
```

## Proposed New Test Files

```txt
frontend/src/modules/hades/hadesViewModel.test.js
frontend/src/modules/hades/hadesUxLayout.test.js
```

If 5.4 mini adds package-level scripts, keep them narrow:

```json
{
  "scripts": {
    "test:post-login-ux": "npm --prefix frontend test"
  }
}
```

Do not add new frontend testing libraries unless absolutely necessary.

## View Model Contract Examples

### Active / Inactive Minion Grouping

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMinionScreenViewModel } from "./hadesViewModel.js";

test("minion screen view model splits active and inactive minions without changing api shape", () => {
  const apiState = {
    minions: [
      { id: "cat", name: "Cat Courier", status: "active", command: "!sendcat" },
      { id: "price", name: "Price Imp", status: "paused", schedule: "every 5 hours" }
    ],
    assignments: [],
    socialLinks: []
  };

  const view = buildMinionScreenViewModel(apiState);

  assert.deepEqual(
    view.active.map((minion) => minion.id),
    ["cat"]
  );
  assert.deepEqual(
    view.inactive.map((minion) => minion.id),
    ["price"]
  );
  assert.equal(apiState.minions[0].destinationLabel, undefined);
});
```

### Destination Preview

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMinionDetailViewModel } from "./hadesViewModel.js";

test("detail view keeps destination preview separate from command syntax", () => {
  const detail = buildMinionDetailViewModel({
    id: "cat",
    name: "Cat Courier",
    status: "active",
    mode: "manual",
    command: "!sendcat <description>",
    destination: { provider: "discord", channelName: "#cat-chaos" }
  });

  assert.equal(detail.destinationPreview.type, "discord");
  assert.equal(detail.commandSyntax, "!sendcat <description>");
  assert.match(detail.plainDescription, /cat gifs/i);
  assert.ok(detail.followUpExamples.some((example) => example.startsWith("!hades")));
});
```

### Notification Metadata

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNotificationViewModel } from "./hadesViewModel.js";

test("notification logs preserve exact location metadata and open actions", () => {
  const view = buildNotificationViewModel([
    {
      id: "log-1",
      mode: "manual",
      minionId: "cat",
      provider: "discord",
      server: "Hades Test Server",
      channel: "#cat-chaos",
      messageId: "1042",
      createdAt: "2026-06-13T12:00:00-04:00"
    }
  ]);

  assert.equal(view.manual[0].locationLabel, "Discord · Hades Test Server · #cat-chaos · message 1042");
  assert.equal(view.manual[0].openLabel, "Open Discord location");
  assert.equal(view.manual[0].targetMinionId, "cat");
});
```

## Layout Guard Examples

These tests are intentionally source-level. They prevent the specific regressions the user has been seeing: overflow, hidden content, and broken bottom nav.

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../styles/hades.css", import.meta.url), "utf8");

test("post-login shell defines contained scroll surfaces", () => {
  for (const selector of [
    ".minion-list-scroll",
    ".past-summons-scroll",
    ".notification-log-scroll",
    ".detail-scroll",
    ".activity-log-scroll"
  ]) {
    assert.match(css, new RegExp(`${selector.replace(".", "\\.")}[^}]*overflow-y:\\s*auto`, "s"));
    assert.match(css, new RegExp(`${selector.replace(".", "\\.")}[^}]*min-height:\\s*0`, "s"));
  }
});
```

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("phase does not alter the approved login template", () => {
  const login = readFileSync(new URL("../../auth/loginTemplate.html", import.meta.url), "utf8");

  assert.match(login, /START THE FORGE|Start the forge/i);
  assert.match(login, /or continue with/i);
});
```

## Browser Acceptance Checks

After tests pass, 5.4 mini should verify in the in-app browser:

- `/app/minions`
- `/forge`
- `/app/socials`
- `/app/settings`
- one Minion Detail route or detail modal/state

Widths:

- 375px
- 390px
- 430px

Manual criteria:

- Active list scrolls inside its panel.
- Inactive list scrolls inside its panel.
- Minion Slots remains below the list.
- Forge Past Summons scroll inside their panel.
- Notification dropdown never overflows horizontally.
- Bottom nav stays fixed.
- Minion Detail order matches the UX contract.
- Login screen still looks like the accepted full-background login.

