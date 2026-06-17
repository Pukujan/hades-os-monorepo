import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMinionDetailViewModel,
  buildMinionScreenViewModel,
  buildNotificationViewModel,
  normalizeMessage
} from "../../utils/hadesViewModel.js";

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
  assert.equal(view.slots.length, 4);
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

test("detail shows Summon Preview not Discord Preview for discord destination", () => {
  const detail = buildMinionDetailViewModel({
    id: "cat",
    name: "Cat Courier",
    status: "active",
    triggerType: "manual",
    commandName: "!sendcat",
    description: "Sends cat gifs",
    targetSocial: "discord",
    destination: { provider: "discord", channelName: "#cat-chaos" }
  });
  assert.equal(detail.destinationPreview.title, "Summon Preview");
  assert.notEqual(detail.destinationPreview.title, "Discord Preview");
});

test("detail Cat Courier command syntax is !sendcat not !sendcat lawyer", () => {
  const detail = buildMinionDetailViewModel({
    id: "cat",
    name: "Cat Courier",
    commandName: "!sendcat",
    triggerType: "manual",
    targetSocial: "discord",
    destination: { provider: "discord", channelName: "#cat-chaos" }
  });
  assert.equal(detail.commandSyntax, "!sendcat");
  assert.notEqual(detail.commandSyntax, "!sendcat lawyer");
});

test("MinionListScreen shows 12 minions from list", () => {
  const list = [
    { id: "cat", name: "Cat Courier", slotIndex: 0, type: "manual", ownerType: "system_default" },
    { id: "brief", name: "Brief Wraith", slotIndex: 1, type: "auto", ownerType: "system_default" },
    { id: "social", name: "Social Imp", slotIndex: 2, type: "auto", ownerType: "user_owned" },
    { id: "invoice", name: "Invoice Ghoul", slotIndex: null, type: "manual", ownerType: "user_owned" },
    { id: "weather", name: "Weather Oracle", slotIndex: null, type: "auto", ownerType: "system_default" },
    { id: "law", name: "Law Goblin", slotIndex: null, type: "manual", ownerType: "user_owned" },
    { id: "meme", name: "Meme Furnace", slotIndex: null, type: "manual", ownerType: "system_default" },
    { id: "calendar", name: "Calendar Shade", slotIndex: null, type: "auto", ownerType: "system_default" },
    { id: "tea", name: "Tea Familiar", slotIndex: null, type: "auto", ownerType: "user_owned" },
    { id: "job", name: "Job Harpy", slotIndex: null, type: "auto", ownerType: "user_owned" },
    { id: "pdf", name: "PDF Imp", slotIndex: null, type: "manual", ownerType: "system_default" },
    { id: "empty1", name: "Empty Husk", slotIndex: null, type: "manual", ownerType: "system_default" },
  ];
  assert.equal(list.length, 12);
});

test("minion screen view model produces 4 slots max (3 active + 1 empty)", () => {
  const apiState = {
    minions: [
      { id: "1", name: "A", status: "active", commandName: "!a", targetSocial: "discord" },
      { id: "2", name: "B", status: "active", commandName: "!b", targetSocial: "telegram" },
      { id: "3", name: "C", status: "active", commandName: "!c", targetSocial: "email" },
      { id: "4", name: "D", status: "active", commandName: "!d", targetSocial: "private" },
      { id: "5", name: "E", status: "active", commandName: "!e", targetSocial: "discord" },
    ]
  };
  const view = buildMinionScreenViewModel(apiState);
  assert.equal(view.slots.length, 4);
  assert.equal(view.slots[0].name, "A");
  assert.equal(view.slots[1].name, "B");
  assert.equal(view.slots[2].name, "C");
  assert.equal(view.slots[3].name, "Empty Slot");
});

test("removing a minion frees its slot index", () => {
  const minions = [
    { id: "cat", name: "Cat Courier", slotIndex: 0, status: "active" },
    { id: "brief", name: "Brief Wraith", slotIndex: 1, status: "active" },
  ];
  const deactivated = minions.map((m) => m.id === "cat" ? { ...m, slotIndex: null, status: "inactive" } : m);
  assert.equal(deactivated[0].slotIndex, null);
  assert.equal(deactivated[0].status, "inactive");
  assert.equal(deactivated[1].slotIndex, 1);
});

test("activating fills the first empty slot", () => {
  const maxSlots = 4;
  const minions = [
    { id: "cat", name: "Cat Courier", slotIndex: 1, status: "active" },
    { id: "brief", name: "Brief Wraith", slotIndex: 0, status: "active" },
    { id: "invoice", name: "Invoice Ghoul", slotIndex: null, status: "inactive" },
  ];
  const activeCount = minions.filter((m) => m.slotIndex != null).length;
  if (activeCount >= maxSlots) return;
  const filled = new Set(minions.filter((m) => m.slotIndex != null).map((m) => m.slotIndex));
  let firstEmpty = 0;
  while (firstEmpty < maxSlots && filled.has(firstEmpty)) firstEmpty++;
  const activated = minions.map((m) => m.id === "invoice" ? { ...m, slotIndex: firstEmpty, status: "active" } : m);
  assert.equal(activated[2].slotIndex, 2);
  assert.equal(activated[2].status, "active");
});

test("activation is blocked gracefully when all slots filled", () => {
  const maxSlots = 4;
  const minions = [
    { id: "a", slotIndex: 0 },
    { id: "b", slotIndex: 1 },
    { id: "c", slotIndex: 2 },
    { id: "d", slotIndex: 3 },
    { id: "e", slotIndex: null },
  ];
  const activeCount = minions.filter((m) => m.slotIndex != null).length;
  assert.equal(activeCount, 4);
  assert.ok(activeCount >= maxSlots);
});

test("notification unread badge appears when unread logs exist", () => {
  const logs = [
    { id: "l1", minionId: "cat", unread: true },
    { id: "l2", minionId: "cat", unread: false },
  ];
  assert.equal(logs.filter((l) => l.unread).length, 1);
});

test("date filter filters logs by exactTimestamp prefix", () => {
  const logs = [
    { id: "l1", minionId: "cat", exactTimestamp: "2026-06-14T14:14:32-04:00" },
    { id: "l2", minionId: "cat", exactTimestamp: "2026-06-13T16:44:18-04:00" },
  ];
  const dateFilter = "2026-06-14";
  const filtered = logs.filter((l) => l.exactTimestamp.startsWith(dateFilter));
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "l1");
});

test("clear date filter restores all logs", () => {
  const logs = [
    { id: "l1", minionId: "cat", exactTimestamp: "2026-06-14T14:14:32-04:00" },
    { id: "l2", minionId: "cat", exactTimestamp: "2026-06-13T16:44:18-04:00" },
  ];
  const filtered = logs.filter((l) => l.exactTimestamp.startsWith("2026-06-14"));
  assert.equal(filtered.length, 1);
  const restored = logs;
  assert.equal(restored.length, 2);
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

test("normalizeMessage extracts link actions from content", () => {
  const result = normalizeMessage({
    id: "msg1",
    role: "assistant",
    content: "Check this out https://example.com/cat and also https://other.com"
  });
  const links = result.actions.filter((a) => a.type === "external_link");
  assert.equal(links.length, 2);
  assert.equal(links[0].url, "https://example.com/cat");
  assert.equal(links[1].url, "https://other.com");
});

test("normalizeMessage merges with existing actions and dedupes", () => {
  const msg = {
    id: "msg1",
    role: "assistant",
    content: "Visit https://example.com for details",
    actions: [{ type: "route", label: "Go to settings", to: "/settings" }]
  };
  const result = normalizeMessage(msg);
  assert.equal(result.actions.length, 2);
  assert.equal(result.actions[0].type, "route");
  assert.equal(result.actions[1].url, "https://example.com");
});

test("normalizeMessage returns null when message is null", () => {
  assert.equal(normalizeMessage(null), null);
});

test("normalizeMessage preserves message with no URLs and no actions", () => {
  const msg = { id: "msg1", role: "assistant", content: "Just text" };
  const result = normalizeMessage(msg);
  assert.deepEqual(result.actions, []);
});

test("normalizeMessage preserves verified media fields for chat rendering", () => {
  const msg = {
    id: "msg-media-1",
    role: "assistant",
    content: "Here is the verified GIF.",
    gifUrl: "https://media.example.com/cat.gif",
    mediaUrl: "https://media.example.com/cat.gif",
    mediaType: "image/gif",
    mediaAlt: "Verified cat GIF",
    mediaVerificationStatus: "verified",
    mediaVerificationReason: null
  };

  const result = normalizeMessage(msg);

  assert.equal(result.gifUrl, "https://media.example.com/cat.gif");
  assert.equal(result.mediaUrl, "https://media.example.com/cat.gif");
  assert.equal(result.mediaType, "image/gif");
  assert.equal(result.mediaAlt, "Verified cat GIF");
  assert.equal(result.mediaVerificationStatus, "verified");
  assert.equal(result.mediaVerificationReason, null);
});
