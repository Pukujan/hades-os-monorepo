# Hades OS MVP Codex Handoff

## Purpose

This handoff package gives Codex the product, UX, and implementation direction for the Hades OS MVP.

Hades OS MVP is a mobile-first consumer automation companion with a private founder/dev Forge layer.

The first usable build should prove this loop:

```txt
open Hades
→ chat with Hades
→ describe a minion naturally
→ Hades fills the minion draft schema
→ Hades asks only for missing fields
→ user tests the minion
→ user saves the minion
→ user assigns it to a social link placeholder
```

## Important MVP Scope

Implement the MVP, not the full future platform.

MVP includes:

```txt
mobile-first app shell
Ember Forge default theme
lightweight Settings theme switcher
Ask Hades chat
offline-safe pending messages
starter minions
natural-language minion creator chat
live minion draft card
simulated minion testing
save minion
social link placeholders
assign minion to social link
inventory preview
basic level/onboarding preview
inbox preview
private Forge preview
locked future previews
```

MVP does not include:

```txt
real Discord bot deployment
real Telegram bot deployment
real marketplace
payments
credits
creator payouts
real skin economy
real social network
React Native
worker execution
repo mutation
automatic PRs
multi-user business roles
```

## Prototype

Open:

```txt
prototype/hades-mvp-interactive.html
```

This is the visual and interaction reference. It is not production code. Convert the ideas into the existing React + Node scaffold using the repo's module boundaries.

## Recommended Build Order

```txt
1. App shell + theme switcher
2. Auth/session guard if not already present
3. Ask Hades chat UI
4. Offline outbox for pending chat messages
5. Minion data model + starter minions
6. Natural-language minion draft creation
7. Live minion draft card
8. Simulated test/save flow
9. Social links placeholders
10. Minion assignment to socials
11. Inbox/task status preview
12. Private Forge preview routes
```

## Non-Negotiable UX Rule

Do not turn Hades into a generic developer dashboard.

The UI should feel:

```txt
mobile-first
gamery
smooth
guided
beginner-friendly
consumer-readable
forge-themed
```

The private Forge layer exists, but it should not dominate the first experience.
