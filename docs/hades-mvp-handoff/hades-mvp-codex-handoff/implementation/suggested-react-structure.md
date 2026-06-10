# Suggested React Structure

Use the existing React + Node scaffold.

## Frontend Structure

```txt
frontend/src/
  app/
    AppShell.tsx
    routes.tsx

  modules/
    auth/
    chat/
      ChatScreen.tsx
      ChatComposer.tsx
      MessageBubble.tsx
      chatTypes.ts
      chatState.ts

    offline-outbox/
      outboxTypes.ts
      outboxStore.ts
      syncService.ts
      useOutboxSync.ts

    minions/
      MinionInventory.tsx
      MinionCard.tsx
      MinionDraftCard.tsx
      minionTypes.ts
      minionDraftParser.ts

    socials/
      SocialLinksScreen.tsx
      SocialCard.tsx
      MinionAssignmentForm.tsx
      socialTypes.ts

    inbox/
      InboxScreen.tsx
      InboxAlert.tsx

    settings/
      SettingsScreen.tsx
      ThemeSwitcher.tsx
      ProfileCardPreview.tsx

    forge/
      ForgePreview.tsx
      GithubTaskPacketHelper.tsx
      TaskLogsPreview.tsx

    shared/
      Button.tsx
      Card.tsx
      Badge.tsx
      BottomNav.tsx
      TopBar.tsx

  services/
    hadesApi.ts
    minionsApi.ts
    socialsApi.ts
    outboxStore.ts
    syncService.ts

  styles/
    themes.css
    globals.css
```

## Backend Structure

```txt
backend/src/
  modules/
    auth/
    chat/
    minions/
    socials/
    task-runs/
    github-ticket-resolver/
    shared/
      idempotency/
  server.ts
```

## Shared Types

```txt
packages/shared/src/types/
  minion.ts
  social.ts
  chat.ts
  outbox.ts
  level.ts
```

## Theme Implementation

Use CSS variables:

```css
:root[data-theme="ember"] { ... }
:root[data-theme="arcane"] { ... }
:root[data-theme="grove"] { ... }
```

or:

```tsx
<div data-theme={theme}>
  ...
</div>
```

Keep theme switching lightweight.
