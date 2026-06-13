import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMinionDetailViewModel,
  buildMinionScreenViewModel,
  buildNotificationViewModel
} from "./hadesViewModel.js";

test("minion screen view model splits active and inactive minions without mutating api state", () => {
  const apiState = {
    minions: [
      { id: "cat", name: "Cat Courier", status: "active", commandName: "!sendcat", targetSocial: "discord" },
      { id: "price", name: "Price Imp", status: "paused", triggerType: "automatic", schedule: "every 5 hours", targetSocial: "email" }
    ]
  };

  const view = buildMinionScreenViewModel(apiState);

  assert.deepEqual(view.active.map((minion) => minion.id), ["cat"]);
  assert.deepEqual(view.inactive.map((minion) => minion.id), ["price"]);
  assert.equal(view.slots.length, 3);
  assert.equal(view.slots[1].name, "Empty Slot");
  assert.equal(apiState.minions[0].destinationLabel, undefined);
});

test("minion detail keeps preview, syntax, and plain explanation separate", () => {
  const detail = buildMinionDetailViewModel({
    id: "cat",
    name: "Cat Courier",
    status: "active",
    triggerType: "manual",
    commandName: "!sendcat <description>",
    description: "This minion sends cat gifs based on the description you give it.",
    targetSocial: "discord",
    destination: { provider: "discord", channelName: "#cat-chaos" }
  });

  assert.equal(detail.statusMode.statusLabel, "Active");
  assert.equal(detail.statusMode.modeLabel, "Manual summon");
  assert.equal(detail.destinationPreview.type, "discord");
  assert.equal(detail.commandSyntax, "!sendcat <description>");
  assert.match(detail.plainDescription, /!hades/i);
  assert.ok(detail.followUpExamples.length >= 3);
});

test("notification view model preserves exact location metadata and open labels", () => {
  const view = buildNotificationViewModel([
    {
      id: "n1",
      mode: "manual",
      provider: "discord",
      server: "Hades Test Server",
      channel: "#cat-chaos",
      messageId: "1042"
    },
    {
      id: "n2",
      mode: "automated",
      provider: "gmail",
      account: "pujan@gmail.com",
      recipient: "alex@example.com",
      subject: "Summary Draft"
    }
  ]);

  assert.equal(view.manual[0].locationLabel, "Discord · Hades Test Server · #cat-chaos · message 1042");
  assert.equal(view.manual[0].openLabel, "Open Discord location");
  assert.equal(view.automated[0].locationLabel, "Gmail · pujan@gmail.com · to: alex@example.com · subject: Summary Draft");
  assert.equal(view.automated[0].openLabel, "Open Gmail thread");
});

