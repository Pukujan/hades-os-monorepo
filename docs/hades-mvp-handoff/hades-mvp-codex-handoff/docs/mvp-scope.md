# MVP Scope — Hades OS

## MVP Statement

Hades MVP is a mobile-first Hades chat agent that helps the founder/user create, test, save, and assign simple minions to social links, with starter minions, offline-safe chat, inventory preview, level/onboarding preview, theme switcher, and locked future systems.

## Core Loop

```txt
Open Hades
→ talk to Hades
→ describe a minion naturally
→ Hades creates a draft
→ Hades asks only for missing information
→ test the minion
→ save the minion
→ assign it to Discord / Telegram / GitHub / Private placeholder
→ see it in inventory
```

## MVP Includes

```txt
1. Mobile-first app shell
2. Ember Forge default theme
3. Lightweight theme switcher
4. Ask Hades chat
5. Offline pending message behavior
6. Starter minion cards
7. Minion inventory preview
8. Natural-language minion creator
9. Live minion draft card
10. Simulated test flow
11. Save minion flow
12. Social link placeholders
13. Minion assignment to social link
14. Inbox preview
15. Level/onboarding preview
16. Founder/private Forge preview
17. Locked marketplace/social/creator/business previews
```

## MVP Excludes

```txt
real social deployment
real Discord bot
real Telegram bot
marketplace payments
credits
creator payouts
React Native
public social network
real minion rentals
real scraping
real meeting transcription
worker execution
repo mutation
automatic pull requests
advanced role system
```

## Starter Minions

Use a small set only:

```txt
Task Helper
Chat Summarizer
GitHub Task Packet Helper
Cat Meme Command preview
Deal Watcher preview
```

Only 2–3 need to be active/testable. Others can be locked previews.

## Level System MVP

MVP should show the level system visually, not implement a complex XP economy.

Include:

```txt
Level badge
progress bar
next unlock preview
locked second slot / unlocked second slot after first save
```

Example:

```txt
Level 1 — New Summoner
Next unlock: second minion slot

After first saved minion:
Level 2 — Helper Tamer
Unlocked: second minion slot preview
```

## Social Links MVP

Socials are placeholders for now.

Supported UI cards:

```txt
Discord
Telegram
GitHub
Email
Private
```

Each social card should show:

```txt
connection status
assigned minions
slot usage
command name if any
locked/live status
```

Be honest in copy:

```txt
Saved and assigned as a preview. Discord connection is not live yet.
```
