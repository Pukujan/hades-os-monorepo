# Hades OS Multi-User Auth + Hermes Isolation Unit Test Pack

Assumption: Vitest-style backend tests.

```txt
Core contract:
Hermes runtime can be shared.
Every request/context/data read must be scoped by userId + tenantId before Hermes runs.
```

---

## 1. `backend/src/modules/auth/__tests__/authMiddleware.test.js`

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireHadesAuth } from "../authMiddleware.js";

describe("requireHadesAuth", () => {
  let supabaseAuth;

  beforeEach(() => {
    supabaseAuth = {
      getUserFromToken: vi.fn(),
    };
  });

  it("rejects request with no session token", async () => {
    const req = { headers: {} };

    await expect(requireHadesAuth(req, { supabaseAuth }))
      .rejects.toMatchObject({ code: "missing_auth" });
  });

  it("rejects request with invalid session token", async () => {
    const req = { headers: { authorization: "Bearer bad-token" } };

    supabaseAuth.getUserFromToken.mockResolvedValue(null);

    await expect(requireHadesAuth(req, { supabaseAuth }))
      .rejects.toMatchObject({ code: "invalid_auth" });
  });

  it("accepts request with valid Supabase session", async () => {
    const req = { headers: { authorization: "Bearer valid-token" } };

    supabaseAuth.getUserFromToken.mockResolvedValue({
      id: "user_a",
      app_metadata: { tenant_id: "tenant_a" },
    });

    const result = await requireHadesAuth(req, { supabaseAuth });

    expect(result).toEqual({
      userId: "user_a",
      tenantId: "tenant_a",
      sessionToken: "valid-token",
    });
  });

  it("defaults tenantId to userId when tenant_id is missing", async () => {
    const req = { headers: { authorization: "Bearer valid-token" } };

    supabaseAuth.getUserFromToken.mockResolvedValue({
      id: "user_a",
      app_metadata: {},
    });

    const result = await requireHadesAuth(req, { supabaseAuth });

    expect(result.tenantId).toBe("user_a");
  });

  it("does not allow client-provided userId to override session userId", async () => {
    const req = {
      headers: { authorization: "Bearer valid-token" },
      body: { user_id: "user_b", tenant_id: "tenant_b" },
    };

    supabaseAuth.getUserFromToken.mockResolvedValue({
      id: "user_a",
      app_metadata: { tenant_id: "tenant_a" },
    });

    const result = await requireHadesAuth(req, { supabaseAuth });

    expect(result.userId).toBe("user_a");
    expect(result.tenantId).toBe("tenant_a");
  });
});
```

---

## 2. `backend/src/modules/hades/repositories/__tests__/minionRepository.scope.test.js`

```js
import { describe, it, expect, beforeEach } from "vitest";
import { createMinionRepository } from "../minionRepository.js";

describe("minionRepository tenant scoping", () => {
  let repo;

  beforeEach(async () => {
    repo = createMinionRepository({ storage: "memory" });

    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "minion_a", name: "User A Minion", commandName: "!a" },
    });

    await repo.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "User B Minion", commandName: "!b" },
    });
  });

  it("findById returns minion owned by current user", async () => {
    const minion = await repo.findById({
      id: "minion_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(minion).toMatchObject({
      id: "minion_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
    });
  });

  it("findById returns null for another user's minion", async () => {
    const minion = await repo.findById({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(minion).toBeNull();
  });

  it("listByUser only returns current user's minions", async () => {
    const minions = await repo.listByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(minions).toHaveLength(1);
    expect(minions[0].id).toBe("minion_a");
  });

  it("create stores user_id and tenant_id", async () => {
    const minion = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "minion_c", name: "Scoped Minion" },
    });

    expect(minion.user_id).toBe("user_a");
    expect(minion.tenant_id).toBe("tenant_a");
  });

  it("update rejects another user's minion", async () => {
    const updated = await repo.update({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
      patch: { name: "Hijacked" },
    });

    expect(updated).toBeNull();
  });

  it("delete rejects another user's minion", async () => {
    const deleted = await repo.delete({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(deleted).toBe(false);

    const stillExists = await repo.findById({
      id: "minion_b",
      userId: "user_b",
      tenantId: "tenant_b",
    });

    expect(stillExists).not.toBeNull();
  });
});
```

---

## 3. `backend/src/modules/hades/repositories/__tests__/assignmentRepository.scope.test.js`

```js
import { describe, it, expect, beforeEach } from "vitest";
import { createAssignmentRepository } from "../assignmentRepository.js";

describe("assignmentRepository tenant scoping", () => {
  let repo;

  beforeEach(async () => {
    repo = createAssignmentRepository({ storage: "memory" });

    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "assign_a",
        minion_id: "minion_a",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });

    await repo.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "assign_b",
        minion_id: "minion_b",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });
  });

  it("findActiveAssignment only searches current user's assignments", async () => {
    const assignment = await repo.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!catgif",
    });

    expect(assignment.id).toBe("assign_a");
    expect(assignment.user_id).toBe("user_a");
  });

  it("does not return another user's matching command assignment", async () => {
    const assignment = await repo.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "telegram",
      commandName: "!catgif",
    });

    expect(assignment).toBeNull();
  });

  it("create stores user_id and tenant_id", async () => {
    const assignment = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "assign_c",
        minion_id: "minion_c",
        provider: "telegram",
        command_name: "/summarize",
        status: "active",
      },
    });

    expect(assignment.user_id).toBe("user_a");
    expect(assignment.tenant_id).toBe("tenant_a");
  });

  it("ignores inactive assignments", async () => {
    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "assign_inactive",
        minion_id: "minion_inactive",
        provider: "discord",
        command_name: "!off",
        status: "inactive",
      },
    });

    const assignment = await repo.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!off",
    });

    expect(assignment).toBeNull();
  });
});
```

---

## 4. `backend/src/modules/hades/repositories/__tests__/conversationRepository.scope.test.js`

```js
import { describe, it, expect, beforeEach } from "vitest";
import { createConversationRepository } from "../conversationRepository.js";

describe("conversationRepository tenant scoping", () => {
  let repo;

  beforeEach(async () => {
    repo = createConversationRepository({ storage: "memory" });

    await repo.createConversation({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "conv_a", title: "A Conversation" },
    });

    await repo.createConversation({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "conv_b", title: "B Conversation" },
    });

    await repo.addMessage({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_a",
      data: { id: "msg_a", role: "user", content: "A secret" },
    });

    await repo.addMessage({
      userId: "user_b",
      tenantId: "tenant_b",
      conversationId: "conv_b",
      data: { id: "msg_b", role: "user", content: "B secret" },
    });
  });

  it("list conversations returns only current user's conversations", async () => {
    const conversations = await repo.listConversations({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(conversations).toHaveLength(1);
    expect(conversations[0].id).toBe("conv_a");
  });

  it("messages from User B are invisible to User A", async () => {
    const messages = await repo.listMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_b",
    });

    expect(messages).toEqual([]);
  });

  it("clear messages only clears current user's conversation", async () => {
    await repo.clearMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_a",
    });

    const userAMessages = await repo.listMessages({
      userId: "user_a",
      tenantId: "tenant_a",
      conversationId: "conv_a",
    });

    const userBMessages = await repo.listMessages({
      userId: "user_b",
      tenantId: "tenant_b",
      conversationId: "conv_b",
    });

    expect(userAMessages).toEqual([]);
    expect(userBMessages).toHaveLength(1);
  });
});
```

---

## 5. `backend/src/modules/hades/repositories/__tests__/telegramConnectionRepository.test.js`

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTelegramConnectionRepository } from "../telegramConnectionRepository.js";

describe("telegramConnectionRepository", () => {
  let repo;
  let crypto;

  beforeEach(() => {
    crypto = {
      encrypt: vi.fn((value) => `encrypted:${value}`),
      decrypt: vi.fn((value) => value.replace("encrypted:", "")),
    };

    repo = createTelegramConnectionRepository({
      storage: "memory",
      crypto,
    });
  });

  it("stores encrypted_bot_token", async () => {
    const record = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    expect(record.encrypted_bot_token).toBe("encrypted:123456:SECRET");
    expect(record.encrypted_bot_token).not.toBe("123456:SECRET");
  });

  it("stores token_last4", async () => {
    const record = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRETABCD",
      botUsername: "hades_bot",
      status: "connected",
    });

    expect(record.token_last4).toBe("ABCD");
  });

  it("does not return plaintext token in public response", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    const publicRecord = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(publicRecord.encrypted_bot_token).toBeUndefined();
    expect(publicRecord.bot_token).toBeUndefined();
    expect(publicRecord.token_last4).toBe("CRET");
  });

  it("decrypts token only for runtime send path", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "123456:SECRET",
      botUsername: "hades_bot",
      status: "connected",
    });

    const runtimeRecord = await repo.findRuntimeTokenByTelegramUserId({
      telegramUserId: "tg_123",
    });

    expect(runtimeRecord.botToken).toBe("123456:SECRET");
  });

  it("marks token_invalid when test fails", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      telegramUserId: "tg_123",
      botToken: "bad-token",
      botUsername: null,
      status: "token_invalid",
    });

    const record = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(record.status).toBe("token_invalid");
  });

  it("does not return User B connection for User A", async () => {
    await repo.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      telegramUserId: "tg_b",
      botToken: "999:SECRET",
      botUsername: "b_bot",
      status: "connected",
    });

    const record = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(record).toBeNull();
  });
});
```

---

## 6. `backend/src/modules/hades/repositories/__tests__/discordConnectionRepository.test.js`

```js
import { describe, it, expect, beforeEach } from "vitest";
import { createDiscordConnectionRepository } from "../discordConnectionRepository.js";

describe("discordConnectionRepository", () => {
  let repo;

  beforeEach(() => {
    repo = createDiscordConnectionRepository({ storage: "memory" });
  });

  it("stores discord_user_id, guild_id, and channel_id", async () => {
    const record = await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_123",
      guildId: "guild_1",
      channelId: "channel_1",
      status: "connected",
    });

    expect(record).toMatchObject({
      user_id: "user_a",
      tenant_id: "tenant_a",
      discord_user_id: "discord_123",
      guild_id: "guild_1",
      channel_id: "channel_1",
      status: "connected",
    });
  });

  it("filters public connection by userId and tenantId", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_a",
      guildId: "guild_a",
      channelId: "channel_a",
      status: "connected",
    });

    await repo.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      discordUserId: "discord_b",
      guildId: "guild_b",
      channelId: "channel_b",
      status: "connected",
    });

    const record = await repo.findPublicByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(record.discord_user_id).toBe("discord_a");
  });

  it("findByDiscordUserId returns connection owner", async () => {
    await repo.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_a",
      guildId: "guild_a",
      channelId: "channel_a",
      status: "connected",
    });

    const record = await repo.findByDiscordUserId({
      discordUserId: "discord_a",
    });

    expect(record.user_id).toBe("user_a");
    expect(record.tenant_id).toBe("tenant_a");
  });

  it("returns null for unknown discord user", async () => {
    const record = await repo.findByDiscordUserId({
      discordUserId: "missing",
    });

    expect(record).toBeNull();
  });
});
```

---

## 7. `backend/src/modules/hades/runtime/__tests__/verifySocialAccount.test.js`

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVerifySocialAccount } from "../verifySocialAccount.js";

describe("verifySocialAccount", () => {
  let discordConnections;
  let telegramConnections;
  let verifySocialAccount;

  beforeEach(() => {
    discordConnections = {
      findByDiscordUserId: vi.fn(),
    };

    telegramConnections = {
      findByTelegramUserId: vi.fn(),
    };

    verifySocialAccount = createVerifySocialAccount({
      discordConnections,
      telegramConnections,
    });
  });

  it("verifies Discord account linked to a Hades user", async () => {
    discordConnections.findByDiscordUserId.mockResolvedValue({
      id: "discord_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "connected",
    });

    const result = await verifySocialAccount({
      provider: "discord",
      accountId: "discord_123",
    });

    expect(result).toEqual({
      connectionId: "discord_conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
    });
  });

  it("rejects unknown Discord account", async () => {
    discordConnections.findByDiscordUserId.mockResolvedValue(null);

    const result = await verifySocialAccount({
      provider: "discord",
      accountId: "missing",
    });

    expect(result).toEqual({
      ok: false,
      code: "unknown_social_account",
    });
  });

  it("rejects inactive Discord connection", async () => {
    discordConnections.findByDiscordUserId.mockResolvedValue({
      id: "discord_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "revoked",
    });

    const result = await verifySocialAccount({
      provider: "discord",
      accountId: "discord_123",
    });

    expect(result).toEqual({
      ok: false,
      code: "inactive_connection",
    });
  });

  it("verifies Telegram account linked to a Hades user", async () => {
    telegramConnections.findByTelegramUserId.mockResolvedValue({
      id: "telegram_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "connected",
    });

    const result = await verifySocialAccount({
      provider: "telegram",
      accountId: "tg_123",
    });

    expect(result).toEqual({
      connectionId: "telegram_conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "telegram",
    });
  });

  it("rejects unknown Telegram account", async () => {
    telegramConnections.findByTelegramUserId.mockResolvedValue(null);

    const result = await verifySocialAccount({
      provider: "telegram",
      accountId: "missing",
    });

    expect(result).toEqual({
      ok: false,
      code: "unknown_social_account",
    });
  });

  it("rejects inactive Telegram connection", async () => {
    telegramConnections.findByTelegramUserId.mockResolvedValue({
      id: "telegram_conn_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      status: "token_revoked",
    });

    const result = await verifySocialAccount({
      provider: "telegram",
      accountId: "tg_123",
    });

    expect(result).toEqual({
      ok: false,
      code: "inactive_connection",
    });
  });

  it("rejects unsupported provider", async () => {
    const result = await verifySocialAccount({
      provider: "mastodon",
      accountId: "m_123",
    });

    expect(result).toEqual({
      ok: false,
      code: "unsupported_provider",
    });
  });
});
```

---

## 8. `backend/src/modules/hades/runtime/__tests__/hermesContextBuilder.test.js`

```js
import { describe, it, expect } from "vitest";
import { buildHermesContext } from "../hermesContextBuilder.js";

describe("buildHermesContext", () => {
  const authContext = {
    userId: "user_a",
    tenantId: "tenant_a",
    sessionId: "session_a",
  };

  const trigger = {
    provider: "discord",
    accountId: "discord_a",
    channelId: "channel_a",
    content: "!catgif",
    triggerType: "command",
  };

  const minion = {
    id: "minion_a",
    user_id: "user_a",
    tenant_id: "tenant_a",
    name: "Cat Courier",
    command_name: "!catgif",
  };

  const assignment = {
    id: "assign_a",
    user_id: "user_a",
    tenant_id: "tenant_a",
    provider: "discord",
    command_name: "!catgif",
  };

  it("builds context with current userId and tenantId", () => {
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
    });

    expect(context.userId).toBe("user_a");
    expect(context.tenantId).toBe("tenant_a");
  });

  it("includes only current user's minion", () => {
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
    });

    expect(context.minion.id).toBe("minion_a");
  });

  it("throws if minion belongs to another user", () => {
    expect(() =>
      buildHermesContext({
        authContext,
        trigger,
        minion: { ...minion, user_id: "user_b" },
        assignment,
        scopedMemory: [],
        allowedTools: [],
      })
    ).toThrow(/minion_scope_mismatch/);
  });

  it("throws if assignment belongs to another tenant", () => {
    expect(() =>
      buildHermesContext({
        authContext,
        trigger,
        minion,
        assignment: { ...assignment, tenant_id: "tenant_b" },
        scopedMemory: [],
        allowedTools: [],
      })
    ).toThrow(/assignment_scope_mismatch/);
  });

  it("includes only scoped memory records", () => {
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [
        { id: "mem_a", user_id: "user_a", tenant_id: "tenant_a", content: "A memory" },
      ],
      allowedTools: [],
    });

    expect(context.scopedMemory).toHaveLength(1);
    expect(context.scopedMemory[0].content).toBe("A memory");
  });

  it("rejects memory records from another user", () => {
    expect(() =>
      buildHermesContext({
        authContext,
        trigger,
        minion,
        assignment,
        scopedMemory: [
          { id: "mem_b", user_id: "user_b", tenant_id: "tenant_b", content: "B memory" },
        ],
        allowedTools: [],
      })
    ).toThrow(/memory_scope_mismatch/);
  });

  it("excludes encrypted secrets from prompt context", () => {
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
      socialConnection: {
        provider: "telegram",
        bot_username: "hades_bot",
        encrypted_bot_token: "encrypted-secret",
      },
    });

    expect(JSON.stringify(context)).not.toContain("encrypted-secret");
    expect(JSON.stringify(context)).not.toContain("encrypted_bot_token");
  });

  it("marks user-provided content as untrusted input", () => {
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
    });

    expect(context.untrustedInput).toEqual({
      provider: "discord",
      content: "!catgif",
      channelId: "channel_a",
      triggerType: "command",
    });
  });
});
```

---

## 9. `backend/src/modules/hades/runtime/__tests__/minionAssignmentRuntime.auth.test.js`

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMinionAssignmentRuntime } from "../minionAssignmentRuntime.js";

describe("minionAssignmentRuntime auth isolation", () => {
  let verifySocialAccount;
  let assignmentRepository;
  let minionRepository;
  let hermesRuntime;
  let socialClient;
  let executionRepository;
  let runtime;

  beforeEach(() => {
    verifySocialAccount = vi.fn();

    assignmentRepository = {
      findActiveAssignment: vi.fn(),
    };

    minionRepository = {
      findById: vi.fn(),
    };

    hermesRuntime = {
      executeMinion: vi.fn(),
    };

    socialClient = {
      sendMessage: vi.fn(),
    };

    executionRepository = {
      create: vi.fn(),
      updateStatus: vi.fn(),
    };

    runtime = createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });
  });

  it("rejects trigger when verifySocialAccount returns null", async () => {
    verifySocialAccount.mockResolvedValue({ ok: false, code: "unknown_social_account" });

    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_missing",
      content: "!catgif",
    });

    expect(result).toEqual({
      ok: false,
      code: "unknown_social_account",
    });

    expect(hermesRuntime.executeMinion).not.toHaveBeenCalled();
  });

  it("rejects trigger for inactive connection", async () => {
    verifySocialAccount.mockResolvedValue({ ok: false, code: "inactive_connection" });

    const result = await runtime.handleSocialTrigger({
      provider: "telegram",
      accountId: "tg_123",
      content: "/catgif",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("inactive_connection");
    expect(hermesRuntime.executeMinion).not.toHaveBeenCalled();
  });

  it("finds assignment only under verified userId", async () => {
    verifySocialAccount.mockResolvedValue({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment.mockResolvedValue(null);

    await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    expect(assignmentRepository.findActiveAssignment).toHaveBeenCalledWith({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!catgif",
    });
  });

  it("does not execute when no assigned minion exists", async () => {
    verifySocialAccount.mockResolvedValue({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment.mockResolvedValue(null);

    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      content: "!missing",
      commandName: "!missing",
    });

    expect(result).toEqual({
      ok: false,
      code: "no_assigned_minion",
    });

    expect(hermesRuntime.executeMinion).not.toHaveBeenCalled();
  });

  it("does not execute User B minion from User A trigger", async () => {
    verifySocialAccount.mockResolvedValue({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment.mockResolvedValue({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_b",
      provider: "discord",
      command_name: "!catgif",
    });

    minionRepository.findById.mockResolvedValue(null);

    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("minion_not_found");
    expect(hermesRuntime.executeMinion).not.toHaveBeenCalled();
  });

  it("passes scoped context to Hermes", async () => {
    verifySocialAccount.mockResolvedValue({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment.mockResolvedValue({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_a",
      provider: "discord",
      command_name: "!catgif",
    });

    minionRepository.findById.mockResolvedValue({
      id: "minion_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      name: "Cat Courier",
    });

    hermesRuntime.executeMinion.mockResolvedValue({
      outboundActions: [{ type: "send_message", content: "cat gif" }],
    });

    socialClient.sendMessage.mockResolvedValue({ ok: true });

    await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      channelId: "channel_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    expect(hermesRuntime.executeMinion).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          userId: "user_a",
          tenantId: "tenant_a",
        }),
        minion: expect.objectContaining({
          id: "minion_a",
          user_id: "user_a",
        }),
      })
    );
  });

  it("sends outbound action only through verified provider/channel", async () => {
    verifySocialAccount.mockResolvedValue({
      provider: "telegram",
      connectionId: "tg_conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment.mockResolvedValue({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_a",
      provider: "telegram",
      command_name: "/catgif",
    });

    minionRepository.findById.mockResolvedValue({
      id: "minion_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      name: "Cat Courier",
    });

    hermesRuntime.executeMinion.mockResolvedValue({
      outboundActions: [{ type: "send_message", content: "cat gif" }],
    });

    socialClient.sendMessage.mockResolvedValue({ ok: true });

    await runtime.handleSocialTrigger({
      provider: "telegram",
      accountId: "tg_a",
      channelId: "chat_a",
      content: "/catgif",
      commandName: "/catgif",
    });

    expect(socialClient.sendMessage).toHaveBeenCalledWith({
      provider: "telegram",
      connectionId: "tg_conn_a",
      channelId: "chat_a",
      content: "cat gif",
    });
  });

  it("returns social_send_failed when outbound send fails", async () => {
    verifySocialAccount.mockResolvedValue({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment.mockResolvedValue({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_a",
      provider: "discord",
      command_name: "!catgif",
    });

    minionRepository.findById.mockResolvedValue({
      id: "minion_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      name: "Cat Courier",
    });

    hermesRuntime.executeMinion.mockResolvedValue({
      outboundActions: [{ type: "send_message", content: "cat gif" }],
    });

    socialClient.sendMessage.mockResolvedValue({ ok: false });

    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      channelId: "channel_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    expect(result).toEqual({
      ok: false,
      code: "social_send_failed",
    });
  });
});
```

---

## 10. `backend/src/modules/hades/runtime/__tests__/hermesOutputValidator.test.js`

```js
import { describe, it, expect } from "vitest";
import { validateHermesOutput } from "../hermesOutputValidator.js";

describe("validateHermesOutput", () => {
  const authContext = {
    userId: "user_a",
    tenantId: "tenant_a",
  };

  const assignment = {
    id: "assign_a",
    user_id: "user_a",
    tenant_id: "tenant_a",
    provider: "discord",
    channel_id: "channel_a",
  };

  it("accepts valid outboundActions array", () => {
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message", content: "hello" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects unknown action type", () => {
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "delete_database", table: "users" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    expect(result).toEqual({
      ok: false,
      code: "invalid_hermes_output",
      reason: "unknown_action_type",
    });
  });

  it("rejects missing required fields", () => {
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_content");
  });

  it("rejects action using unauthorized provider", () => {
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message", provider: "telegram", content: "hello" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("provider_mismatch");
  });

  it("rejects action targeting another user's channel", () => {
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message", channelId: "channel_b", content: "hello" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("channel_mismatch");
  });

  it("rejects raw shell/file action unless explicitly allowed", () => {
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "run_shell", command: "rm -rf /" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unknown_action_type");
  });

  it("rejects output with unexpected secret fields", () => {
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          {
            type: "send_message",
            content: "hello",
            encrypted_bot_token: "secret",
          },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("secret_field_detected");
  });
});
```

---

## 11. `backend/src/modules/hades/repositories/__tests__/agentExecutionRepository.test.js`

```js
import { describe, it, expect, beforeEach } from "vitest";
import { createAgentExecutionRepository } from "../agentExecutionRepository.js";

describe("agentExecutionRepository", () => {
  let repo;

  beforeEach(() => {
    repo = createAgentExecutionRepository({ storage: "memory" });
  });

  it("creates execution log with user_id and tenant_id", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        provider: "discord",
        trigger_type: "command",
        status: "received",
      },
    });

    expect(execution.user_id).toBe("user_a");
    expect(execution.tenant_id).toBe("tenant_a");
  });

  it("stores provider and trigger type", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        provider: "telegram",
        trigger_type: "command",
        status: "received",
      },
    });

    expect(execution.provider).toBe("telegram");
    expect(execution.trigger_type).toBe("command");
  });

  it("stores minion_id and assignment_id", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        minion_id: "minion_a",
        assignment_id: "assign_a",
        status: "assigned",
      },
    });

    expect(execution.minion_id).toBe("minion_a");
    expect(execution.assignment_id).toBe("assign_a");
  });

  it("stores status success", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        status: "sent",
      },
    });

    expect(execution.status).toBe("sent");
  });

  it("stores status failed and failure_code", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        status: "failed",
        failure_code: "no_assigned_minion",
      },
    });

    expect(execution.status).toBe("failed");
    expect(execution.failure_code).toBe("no_assigned_minion");
  });

  it("never stores decrypted bot token", async () => {
    const execution = await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        id: "exec_a",
        status: "received",
        payload: {
          content: "/catgif",
          botToken: "123456:SECRET",
          encrypted_bot_token: "encrypted-secret",
        },
      },
    });

    expect(JSON.stringify(execution)).not.toContain("123456:SECRET");
    expect(JSON.stringify(execution)).not.toContain("encrypted-secret");
  });

  it("list executions only returns current user's logs", async () => {
    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "exec_a", status: "sent" },
    });

    await repo.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "exec_b", status: "sent" },
    });

    const executions = await repo.listByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(executions).toHaveLength(1);
    expect(executions[0].id).toBe("exec_a");
  });
});
```

---

## 12. `backend/src/modules/hades/__tests__/multiUserIsolation.regression.test.js`

```js
import { describe, it, expect, vi } from "vitest";
import { createHadesTestRuntime } from "../testUtils/createHadesTestRuntime.js";

describe("multi-user isolation regression suite", () => {
  it("User A cannot read User B minion", async () => {
    const app = await createHadesTestRuntime();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Minion" },
    });

    const result = await app.minions.findById({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(result).toBeNull();
  });

  it("User A cannot update User B minion", async () => {
    const app = await createHadesTestRuntime();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Minion" },
    });

    const result = await app.minions.update({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
      patch: { name: "Hijacked" },
    });

    expect(result).toBeNull();
  });

  it("User A cannot delete User B minion", async () => {
    const app = await createHadesTestRuntime();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Minion" },
    });

    const deleted = await app.minions.delete({
      id: "minion_b",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(deleted).toBe(false);
  });

  it("User A cannot read User B assignment", async () => {
    const app = await createHadesTestRuntime();

    await app.assignments.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "assign_b",
        minion_id: "minion_b",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });

    const assignment = await app.assignments.findActiveAssignment({
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!catgif",
    });

    expect(assignment).toBeNull();
  });

  it("User A cannot use User B Discord connection", async () => {
    const app = await createHadesTestRuntime();

    await app.discordConnections.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      discordUserId: "discord_b",
      guildId: "guild_b",
      channelId: "channel_b",
      status: "connected",
    });

    const result = await app.verifySocialAccount({
      provider: "discord",
      accountId: "discord_a",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("unknown_social_account");
  });

  it("User A cannot use User B Telegram token", async () => {
    const app = await createHadesTestRuntime();

    await app.telegramConnections.createOrUpdate({
      userId: "user_b",
      tenantId: "tenant_b",
      telegramUserId: "tg_b",
      botToken: "999:SECRET",
      botUsername: "b_bot",
      status: "connected",
    });

    const result = await app.verifySocialAccount({
      provider: "telegram",
      accountId: "tg_a",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("unknown_social_account");
  });

  it("User A trigger cannot execute User B minion", async () => {
    const app = await createHadesTestRuntime();

    app.hermesRuntime.executeMinion = vi.fn();

    await app.minions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "minion_b", name: "B Cat Minion" },
    });

    await app.assignments.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "assign_b",
        minion_id: "minion_b",
        provider: "discord",
        command_name: "!catgif",
        status: "active",
      },
    });

    await app.discordConnections.createOrUpdate({
      userId: "user_a",
      tenantId: "tenant_a",
      discordUserId: "discord_a",
      guildId: "guild_a",
      channelId: "channel_a",
      status: "connected",
    });

    const result = await app.runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      channelId: "channel_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("no_assigned_minion");
    expect(app.hermesRuntime.executeMinion).not.toHaveBeenCalled();
  });

  it("User A Hermes prompt does not include User B memory", async () => {
    const app = await createHadesTestRuntime();

    await app.memory.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "mem_b", content: "User B private memory" },
    });

    const context = await app.buildContextForUser({
      userId: "user_a",
      tenantId: "tenant_a",
      trigger: { content: "hello" },
    });

    expect(JSON.stringify(context)).not.toContain("User B private memory");
  });

  it("User A execution logs do not include User B payload", async () => {
    const app = await createHadesTestRuntime();

    await app.executions.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "exec_b",
        payload: { content: "B private payload" },
        status: "sent",
      },
    });

    const logs = await app.executions.listByUser({
      userId: "user_a",
      tenantId: "tenant_a",
    });

    expect(JSON.stringify(logs)).not.toContain("B private payload");
  });

  it("cache key for User A cannot return User B context", async () => {
    const app = await createHadesTestRuntime();

    await app.contextCache.set({
      userId: "user_b",
      tenantId: "tenant_b",
      key: "recent_context",
      value: { memory: "B cached memory" },
    });

    const cached = await app.contextCache.get({
      userId: "user_a",
      tenantId: "tenant_a",
      key: "recent_context",
    });

    expect(cached).toBeNull();
  });
});
```

---

## 13. `frontend/src/modules/hades/__tests__/SocialsPage.test.jsx`

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SocialsPage } from "../SocialsPage.jsx";

describe("SocialsPage", () => {
  it("shows Discord disconnected state", () => {
    render(
      <SocialsPage
        connections={{ discord: { status: "disconnected" }, telegram: { status: "disconnected" } }}
      />
    );

    expect(screen.getByText(/Discord/i)).toBeInTheDocument();
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it("shows Discord connected state", () => {
    render(
      <SocialsPage
        connections={{
          discord: { status: "connected", username: "pujan" },
          telegram: { status: "disconnected" },
        }}
      />
    );

    expect(screen.getByText(/connected/i)).toBeInTheDocument();
    expect(screen.getByText(/pujan/i)).toBeInTheDocument();
  });

  it("shows Telegram disconnected state", () => {
    render(
      <SocialsPage
        connections={{
          discord: { status: "disconnected" },
          telegram: { status: "disconnected" },
        }}
      />
    );

    expect(screen.getByText(/Telegram/i)).toBeInTheDocument();
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it("shows Telegram token_testing state", () => {
    render(
      <SocialsPage
        connections={{
          discord: { status: "disconnected" },
          telegram: { status: "token_testing" },
        }}
      />
    );

    expect(screen.getByText(/testing/i)).toBeInTheDocument();
  });

  it("shows Telegram token_valid state", () => {
    render(
      <SocialsPage
        connections={{
          discord: { status: "disconnected" },
          telegram: { status: "token_valid", botUsername: "hades_bot" },
        }}
      />
    );

    expect(screen.getByText(/hades_bot/i)).toBeInTheDocument();
  });

  it("shows Telegram token_invalid state", () => {
    render(
      <SocialsPage
        connections={{
          discord: { status: "disconnected" },
          telegram: { status: "token_invalid" },
        }}
      />
    );

    expect(screen.getByText(/invalid/i)).toBeInTheDocument();
  });

  it("calls connect Discord handler", () => {
    const onConnectDiscord = vi.fn();

    render(
      <SocialsPage
        connections={{
          discord: { status: "disconnected" },
          telegram: { status: "disconnected" },
        }}
        onConnectDiscord={onConnectDiscord}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /connect discord/i }));

    expect(onConnectDiscord).toHaveBeenCalled();
  });

  it("calls paste Telegram token handler", () => {
    const onSubmitTelegramToken = vi.fn();

    render(
      <SocialsPage
        connections={{
          discord: { status: "disconnected" },
          telegram: { status: "disconnected" },
        }}
        onSubmitTelegramToken={onSubmitTelegramToken}
      />
    );

    fireEvent.change(screen.getByLabelText(/telegram bot token/i), {
      target: { value: "123456:SECRET" },
    });

    fireEvent.click(screen.getByRole("button", { name: /test/i }));

    expect(onSubmitTelegramToken).toHaveBeenCalledWith("123456:SECRET");
  });
});
```

---

## 14. `frontend/src/modules/hades/__tests__/AppShell.auth.test.jsx`

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "../AppShell.jsx";

describe("AppShell auth behavior", () => {
  it("redirects unauthenticated user to login", () => {
    const navigate = vi.fn();

    render(
      <AppShell
        session={null}
        navigate={navigate}
      />
    );

    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("renders app for authenticated user", () => {
    render(
      <AppShell
        session={{ user: { id: "user_a" } }}
        initialTab="minions"
      />
    );

    expect(screen.getByText(/Minions/i)).toBeInTheDocument();
  });

  it("clears user-scoped UI state on logout", () => {
    const clearScopedState = vi.fn();

    render(
      <AppShell
        session={null}
        clearScopedState={clearScopedState}
      />
    );

    expect(clearScopedState).toHaveBeenCalled();
  });

  it("reloads scoped minions after account switch", () => {
    const loadScopedMinions = vi.fn();

    render(
      <AppShell
        session={{ user: { id: "user_b" } }}
        previousUserId="user_a"
        loadScopedMinions={loadScopedMinions}
      />
    );

    expect(loadScopedMinions).toHaveBeenCalledWith({ userId: "user_b" });
  });
});
```

---

## Final required test command

```bash
npm test -- --run
```

Or if the repo uses Vitest directly:

```bash
npx vitest run
```

Minimum green condition:

```txt
All auth, repository, social connection, Hermes context, runtime, output validation, execution log, frontend auth, and cross-user regression tests pass.
```
