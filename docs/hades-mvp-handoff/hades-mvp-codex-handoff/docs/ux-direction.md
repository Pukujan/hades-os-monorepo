# UX Direction — Hades OS MVP

## Product Identity

Hades OS is a mobile-first consumer automation companion.

Users do not configure complex automations directly. They talk to Hades, collect minions, test them, save them, and assign them to social links.

The app should feel like:

```txt
ChatGPT mobile
+ Discord command bot hub
+ friendly automation companion
+ gamery minion inventory
+ private forge for the founder
```

It should not feel like:

```txt
enterprise SaaS dashboard
developer ops console only
generic chatbot app
complex Zapier clone
technical JSON editor
```

## Default Theme

Use the Ember Forge theme as default.

Preserve this visual mood:

```txt
dark forge background
ember particles
orange/gold glow
rounded cards
premium fantasy-tech feel
smooth mobile-first shell
```

## Theme Switcher

Theme switcher belongs in:

```txt
Settings → Appearance
```

MVP themes:

```txt
Ember Forge — default
Arcane Night
Grove
```

Implementation should be simple:

```txt
CSS variables
data-theme on app root
optional local/session persistence
```

Do not build a paid skin marketplace in MVP.

## Main MVP Navigation

Mobile bottom nav:

```txt
Home
Minions
Socials
Inbox
Me
```

Founder/private Forge entry can be shown inside Home or Me as a special card/button.

## MVP Screens

### Home / Ask Hades

Purpose:

```txt
main entry
chat with Hades
create minions by describing them
show live draft card
show starter prompts
```

### Minions

Purpose:

```txt
inventory
starter minions
active/inactive status
locked previews
slot preview
```

### Socials

Purpose:

```txt
show social link placeholders
Discord / Telegram / GitHub / Email
assign minions to socials
show command names
```

### Inbox

Purpose:

```txt
Hades sends alerts, test results, sync states, locked feature previews
```

### Me / Settings

Purpose:

```txt
profile card preview
theme switcher
future route previews
founder mode label
```

### Forge Preview

Purpose:

```txt
private founder/dev tools
tool/minion creator
manual automation
GitHub task packet helper
task logs
locked workers/approvals/deployments
```

Keep Forge minimal in MVP.
