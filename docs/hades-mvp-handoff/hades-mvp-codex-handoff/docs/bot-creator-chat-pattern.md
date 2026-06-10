# UX Pattern — Natural-Language Minion Creator Chat

## Purpose

The minion creator should be chat-first and natural-language-first.

The user can create a minion by saying something directly:

```txt
I want a command to send cat memes in Discord.
```

Hades should infer what it can, ask only for missing fields, show a live draft card, let the user test it, then save and assign it.

## Core Rule

```txt
Fill what you can.
Ask only what you need.
Suggest sensible defaults.
Show the draft as it updates.
Let the user test before saving.
```

Do not force a rigid wizard.

## Supported Creation Modes

### Guided Mode

```txt
User: I want to make a bot that sends cat memes.
Hades: Where should it work?
User: Discord.
Hades: What command should trigger it?
User: !sendcatmeme.
```

### Direct Mode

```txt
User: Make me a Discord command called !sendcatmeme that sends a random cat meme gif.
Hades: Done — I drafted this minion. Want to test it?
```

## Minion Draft Schema

```ts
type MinionDraft = {
  name: string | null
  description: string | null
  category:
    | "task"
    | "chat"
    | "shopping"
    | "social"
    | "dev"
    | "fun"
    | "meeting"
    | "personal"
    | null
  targetSocial:
    | "discord"
    | "telegram"
    | "email"
    | "github"
    | "private"
    | null
  triggerType:
    | "manual"
    | "command"
    | "watcher"
    | "scheduled"
    | "social_event"
    | null
  commandName: string | null
  action: string | null
  responseStyle:
    | "funny"
    | "helpful"
    | "short"
    | "detailed"
    | null
  safetyMode: "ask_first" | "auto" | "draft_only"
  testInput: string | null
  status: "incomplete" | "ready_to_test" | "tested" | "saved"
}
```

## Required Fields for MVP

```txt
name
targetSocial or private
triggerType
action
```

If `triggerType = command`, also require:

```txt
commandName
```

Defaults:

```txt
safetyMode: ask_first
responseStyle: helpful
status: incomplete
```

## Example Inference

User:

```txt
I want a command to send cat memes in Discord.
```

Inferred draft:

```json
{
  "name": "Cat Meme Minion",
  "category": "fun",
  "targetSocial": "discord",
  "triggerType": "command",
  "commandName": null,
  "action": "send a random cat meme",
  "status": "incomplete"
}
```

Hades asks:

```txt
Nice — I can make that. What command should trigger it?

Suggestions:
!catmeme
!sendcatmeme
!catgif
```

## Draft Card

Display a friendly card, not raw JSON.

Example:

```txt
Cat Meme Minion

Works in:
Discord

Command:
!sendcatmeme

Action:
Send a random cat meme GIF

Mode:
Ask-first until connected

Status:
Ready to test

[Test] [Save] [Assign]
```

## Test Pattern

Testing is simulated in MVP.

Example:

```txt
Simulating:
User types: !sendcatmeme

Output:
🐱 random cat meme sent
```

No real Discord/Telegram call is required in MVP.

## Save and Assign Pattern

After testing:

```txt
Hades: Test passed. Want to save this minion?
User: save it
Hades: Saved. Should I assign it to Discord now?
```

If Discord is not connected:

```txt
Saved and assigned as a preview. Discord connection is not live yet.
```

## Offline Behavior

Minion creation uses the same offline-safe chat behavior.

Pending local creation messages may be edited or undone before sync.

Synced messages are not editable in MVP; corrections should be sent as new messages.
