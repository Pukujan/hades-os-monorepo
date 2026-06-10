# MVP Test Checklist

## Visual / UX

```txt
App opens in mobile-first layout
Ember Forge theme is default
Theme switcher changes theme
Bottom navigation works
Desktop/tablet layout does not break
Locked future cards are clearly locked
```

## Chat

```txt
User can send a message
Message renders immediately
Pending/offline style exists
Starter prompt chips populate/send messages
Hades responds with useful guided copy
```

## Minion Creator

```txt
Direct request fills draft fields:
"I want a command to send cat memes in Discord"

Hermes infers:
- name
- category
- target social
- trigger type
- action

Hermes asks only for missing command name

Fully specified request does not trigger unnecessary questions:
"Make me a Discord command called !sendcatmeme that sends a random cat meme gif"
```

## Draft Card

```txt
Missing fields are visible
Ready-to-test state appears when required fields are filled
Test action produces simulated output
Save action adds minion to inventory
Assign action moves user to social assignment flow
```

## Minions

```txt
Starter minions render
Saved minion appears in inventory
Locked previews are not active
Slot count updates visually
Level-up preview appears after first save
```

## Socials

```txt
Social cards render
Assignment form works
Assigned minion appears under social card
If social is not connected, UI says it is a preview
```

## Inbox

```txt
Test/assignment alerts can appear
Locked marketplace/social notices appear as preview only
```

## Scope Guardrail

```txt
No real Discord deployment
No real Telegram deployment
No marketplace payments
No creator payouts
No worker execution
No repo mutation
No automatic PRs
```
