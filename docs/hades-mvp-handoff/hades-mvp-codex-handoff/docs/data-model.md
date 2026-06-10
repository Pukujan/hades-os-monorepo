# MVP Data Model

## Minion

```ts
type Minion = {
  id: string
  userId: string
  name: string
  description: string
  instructions: string
  category: "task" | "chat" | "shopping" | "social" | "dev" | "fun"
  triggerType: "manual" | "command" | "watcher"
  commandName: string | null
  status: "draft" | "active" | "inactive" | "locked"
  createdAt: string
  updatedAt: string
}
```

## Social Link

```ts
type SocialLink = {
  id: string
  userId: string
  provider: "discord" | "telegram" | "email" | "github" | "private"
  displayName: string
  status: "not_connected" | "connected" | "locked"
  createdAt: string
  updatedAt: string
}
```

## Minion Assignment

```ts
type MinionAssignment = {
  id: string
  userId: string
  minionId: string
  socialLinkId: string | null
  scope: "private" | "global" | "social"
  commandName: string | null
  status: "active" | "inactive" | "locked"
  createdAt: string
  updatedAt: string
}
```

## Minion Test Run

```ts
type MinionTestRun = {
  id: string
  userId: string
  minionId: string
  testInput: string
  testOutput: string
  status: "running" | "completed" | "failed"
  createdAt: string
}
```

## Chat Message

```ts
type ChatMessage = {
  id: string
  userId: string
  conversationId: string
  clientMessageId: string | null
  idempotencyKey: string | null
  sequenceNumber: number | null
  role: "user" | "assistant" | "system"
  content: string
  status: "queued" | "syncing" | "running" | "completed" | "failed" | "cancelled"
  createdAt: string
  updatedAt: string
}
```

## Local Outbox Item

Stored in IndexedDB.

```ts
type LocalOutboxItem = {
  localId: string
  userId: string
  conversationId: string
  parentLocalId: string | null
  sequenceNumber: number
  type: "chat_message" | "minion_creation" | "minion_assignment"
  payload: unknown
  status: "draft" | "pending" | "syncing" | "sent" | "failed" | "cancelled"
  createdAt: string
  updatedAt: string
  retryCount: number
  idempotencyKey: string
}
```

## Level State

MVP can start with lightweight state.

```ts
type UserLevelState = {
  id: string
  userId: string
  level: number
  title: string
  xp: number
  nextLevelXp: number
  completedMilestones: string[]
  unlockedFeatures: string[]
  createdAt: string
  updatedAt: string
}
```

MVP may implement this locally/visually first, but shape should be respected for later persistence.
