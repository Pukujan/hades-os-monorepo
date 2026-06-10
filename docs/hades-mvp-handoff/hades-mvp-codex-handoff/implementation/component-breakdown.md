# Component Breakdown

## AppShell

Responsibilities:

```txt
mobile-first frame
top bar
bottom nav
route outlet
theme data attribute
founder/private Forge entry
```

## ChatScreen

Responsibilities:

```txt
renders Hades chat
starter prompt chips
offline pending messages
message composer
hooks into minion draft parser
```

## MinionDraftCard

Responsibilities:

```txt
shows draft fields
highlights missing fields
shows status: incomplete / ready_to_test / tested / saved
actions: Test / Save / Assign
```

## MinionInventory

Responsibilities:

```txt
owned minions
starter minions
locked previews
slot usage
level unlock preview
```

## SocialLinksScreen

Responsibilities:

```txt
social cards
connection placeholders
assigned minions
slot usage
assignment form
```

## ThemeSwitcher

Responsibilities:

```txt
theme cards
current selected theme
set data-theme
optional persistence
```

## InboxScreen

Responsibilities:

```txt
pending sync alerts
test results
assignment messages
locked future feature notices
```

## ForgePreview

Responsibilities:

```txt
private founder tools
GitHub task packet helper preview
manual automation preview
task logs preview
locked workers/approvals/deployments
```
