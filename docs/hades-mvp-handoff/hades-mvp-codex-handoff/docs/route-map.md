# Route Map and Screen Structure

## MVP Routes

```txt
/app/home
/app/minions
/app/socials
/app/inbox
/app/settings
/forge
```

`/forge` is founder-only/private in MVP.

## Future Routes — Locked Previews Only

```txt
/market
/creator
/business
/admin
```

Do not implement real behavior for locked future routes in MVP.

## Mobile Nav

```txt
Home
Minions
Socials
Inbox
Me
```

## Founder-Only Entry

Place private Forge access in:

```txt
Home card
or Me / Settings
or hidden route
```

Forge should not clutter normal user nav.

## Screen Responsibilities

### Home

```txt
Ask Hades chat
starter prompt chips
live draft card
level card
starter minion choice
```

### Minions

```txt
inventory
active slots
owned minions
locked previews
```

### Socials

```txt
social placeholders
Discord / Telegram / GitHub / Email
assignment UI
command name preview
```

### Inbox

```txt
pending sync notifications
minion test results
assignment alerts
locked future feature notices
```

### Settings / Me

```txt
profile/player card preview
theme switcher
future route previews
founder mode label
```

### Forge

```txt
tool/minion creator
manual automation
GitHub task packet helper
task logs
locked workers/approvals/deployments
```

Keep Forge simple in MVP.
