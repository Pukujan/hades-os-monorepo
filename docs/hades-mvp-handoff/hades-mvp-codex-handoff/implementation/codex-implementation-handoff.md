# Copy-Paste Codex Handoff Prompt

You are implementing the Hades OS MVP inside the existing React + Node scaffold.

Read the files in this handoff package before coding:

```txt
README.md
docs/ux-direction.md
docs/mvp-scope.md
docs/bot-creator-chat-pattern.md
docs/route-map.md
docs/data-model.md
implementation/suggested-react-structure.md
implementation/component-breakdown.md
implementation/test-checklist.md
prototype/hades-mvp-interactive.html
```

## Goal

Implement the MVP, not the full future platform.

Hades MVP is a mobile-first chat agent that helps the user create, test, save, and assign simple minions to social links.

The core flow:

```txt
Open Hades
→ chat with Hades
→ describe a minion naturally
→ Hades fills a draft schema
→ Hades asks only for missing fields
→ user tests the minion
→ user saves the minion
→ user assigns it to a social link placeholder
→ minion appears in inventory
```

## Product Rules

- Do not make this a generic admin dashboard.
- Use Ember Forge as the default visual theme.
- Keep theme switching lightweight with CSS variables.
- Build mobile-first.
- Socials are placeholders in MVP.
- Tests are simulated in MVP.
- Marketplace, credits, real social deployment, and creator payouts are not MVP.
- Private Forge/dev tools can be visible as preview, but should not dominate the user flow.

## Implement MVP Features

```txt
1. Mobile-first Hades app shell
2. Ember Forge default theme
3. Settings theme switcher: Ember Forge, Arcane Night, Grove
4. Home / Ask Hades chat
5. Starter prompt chips
6. Offline-style pending message state
7. Natural-language minion draft parser
8. Live MinionDraftCard
9. Simulated minion test flow
10. Save minion into inventory
11. Social links placeholders
12. Assign minion to social
13. Inbox alerts for save/test/assignment
14. Level preview: Level 1 → Level 2 after first saved minion
15. Locked future previews
16. Private Forge preview route/card
```

## Minion Creation Behavior

Support direct natural-language input.

Example:

```txt
User: I want a command to send cat memes in Discord.
```

Hades should infer:

```txt
name: Cat Meme Minion
category: fun
targetSocial: Discord
triggerType: command
action: send a random cat meme GIF
commandName: missing
```

Then ask only:

```txt
What command should trigger it?

Suggestions:
!catmeme
!sendcatmeme
!catgif
```

If user says:

```txt
Make me a Discord command called !sendcatmeme that sends a random cat meme gif.
```

Then Hades should create a ready-to-test draft without asking unnecessary questions.

## Required MVP Fields

```txt
name
targetSocial or private
triggerType
action
commandName if triggerType is command
```

## Do Not Build

```txt
real Discord integration
real Telegram integration
real marketplace
payments
credits
creator payouts
React Native
worker execution
repo mutation
automatic PRs
multi-user role system
complex XP economy
```

## Done When

Use `implementation/test-checklist.md`.

Report completion by slice:

```txt
1. UI action tested
2. route/service used
3. state updated
4. file changed
5. test/browser proof
6. known mock/placeholder status
```

Keep the implementation scoped. A locked feature is done when it renders as locked and triggers no real backend behavior.
