# OpenCode Handoff: Minions UI Validation + Chat Markup Cleanup

## Goal

Finish the current Minions UI pass without expanding scope.

This is **not** a backend rebuild and not a new feature pass.

## Current Status

Recent completed work:
- Added missing mock minions to minionPreviewData.js
- Expanded MOCK_PREVIEWS to all 12 minions
- Added logs for new minions
- Added hades_chat destination
- Added emoji field to STARTER_MINIONS
- Renamed "Discord Preview" → "Summon Preview"
- Fixed ActiveSwitch minion id bug
- Added auto schedule mini-note
- Added date filter to MinionLogsScreen
- Added scroll-to-log behavior
- Fixed MinionLogsScreen prop mismatch
- Added maxSlots = 4
- Fixed activateMinion firstEmptySlot logic
- Added unread notification count badge
- Added notif/date-input CSS
- Regenerated MEMORY.md

Important fixed bugs:
- maxSlots was referenced but not defined
- ActiveSwitch passed full minion object instead of minion.id
- MinionLogsScreen expected minions but received minion
- activateMinion used bad reduce(max) logic and could skip slots

Remaining known risk:
- STARTER_MINIONS and MOCK_MINIONS still use different data shapes.
- The frontend may still have screens expecting fields that only exist on one model.

## Hard Scope Boundary

Do not add new major features in this pass.
Do not rebuild backend schema.
Do not redesign the app shell.

Do not change:
- HADES OS logo
- top header layout
- theme button placement
- notification bell placement except badge/dropdown behavior
- bottom navbar labels/icons/structure
- global app background
- phone-shell frame
- Hades pixel/retro visual identity

Keep nested Minion screens inside the existing app shell.
Bottom navbar must remain visible.

Do not add bottom nav items for:
- Minion List
- Logs
- Preview
- Test Run
- Notifications

## Task 1: Manual Runtime Validation

Run the app and manually validate the current Minions flow. Check:
1. Minions screen opens without crash.
2. Exactly 4 active slots render.
3. Filled slot click opens Minion Detail.
4. Empty slot click opens Minion List.
5. Minion List shows 12 minions in a compact grid.
6. Every minion card opens detail without crash.
7. Detail page says "Summon Preview", not "Discord Preview".
8. Cat Courier "How to summon" shows base command only: !sendcat
9. Cat Courier example input appears only inside Summon Preview: !sendcat lawyer
10. Follow-up preview is collapsed by default.
11. Technical details are collapsed by default.
12. Activity snapshot is compact and scrollable if needed.
13. View Logs opens logs for the selected minion.
14. Date filter works.
15. Clear date filter works.
16. Clicking a notification opens logs and scrolls to that row.
17. Notification unread badge appears when unread logs exist.
18. Clicking notification marks it read.
19. Toggle active off removes minion from slot.
20. Toggle active on fills the first empty slot.
21. If all slots are full, activation is blocked gracefully.
22. Manual Summon/Test Run buttons do not crash.

## Task 2: Add Targeted Tests

Add tests for actual UI behavior. Minimum:
- Minions screen renders 4 slots
- Empty slot opens Minion List
- Filled slot opens Detail
- ActiveSwitch calls activate/deactivate with minion.id
- Deactivating removes minion from active slots
- Activating fills first empty slot
- Activation fails gracefully when slots full
- Detail shows "Summon Preview"
- Detail doesn't show "Discord Preview"
- Cat Courier How to summon shows !sendcat
- Cat Courier How to summon doesn't show !sendcat lawyer
- Cat Courier Summon Preview does show !sendcat lawyer
- Logs screen accepts minion/log props without crash
- Date filter filters logs
- Clear date filter restores logs

## Task 3: Normalize Minion Data Shape

Unify STARTER_MINIONS and MOCK_MINIONS through a single normalization function.

Expected normalized UI shape:
```ts
{
  id: string;
  name: string;
  title?: string;
  emoji: string;
  description: string;
  status?: "active" | "inactive";
  command?: string;
  summon?: string;
  destination?: string;
  schedule?: string;
  kind?: "manual" | "auto" | "system" | "empty";
  preview?: unknown;
  logs?: unknown[];
  technicalDetails?: unknown;
}
```

Rules:
- Don't migrate backend data
- Don't remove existing mock data unless safely replaced
- Don't break STARTER_MINIONS or MOCK_MINIONS
- Use fallback values instead of crashing on missing fields

## Task 4: Fix Leaked `<pastor>` / XML Wrapper Tags

Observed bug: `<pastor>You're sitting in the underworld lobby. What do you need?</pastor>` leaking in chat.

Strip whole-reply wrapper tags like `<pastor>`, `<hades>`, `<persona>`, `<reply>`, `<message>`, `<assistant>`.

Add sanitizer in chat response normalization path. Prefer backend/runtime normalization.

Add regression tests for all wrapper tag patterns.

## Task 5: Add Trusted Role/Tone Styling

Style based on `message.role`, `message.type`, `message.tone`, `conversationMode`.
Do not style based on raw tags from Hermes text.

Use CSS classes: `.chat-text--aside`, `.chat-text--warning`, `.chat-text--emphasis`.

## Task 6: Keep Hades Voice Intact

Do not make Hades generic. The issue is leaked wrapper markup, not tone.

## Return Format

Return a report in the specified format with summary, changed files, manual validation, data shape fix, chat markup fix, tests, build result, and remaining risks.
