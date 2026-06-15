import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("notificationsRepository", () => {
  it("exports createNotificationsRepository", async () => {
    const mod = await import("../../notificationsRepository.js");
    assert.equal(typeof mod.createNotificationsRepository, "function");
  });

  it("insertNotification stores a notification", async () => {
    const mod = await import("../../notificationsRepository.js");
    const repo = mod.createNotificationsRepository({ tenantId: "tenant_1" });

    const notification = await repo.insertNotification({
      userId: "user_1",
      title: "Test Notification",
      message: "This is a test",
      type: "info",
    });

    assert.ok(notification.id);
    assert.equal(notification.title, "Test Notification");
    assert.equal(notification.type, "info");
    assert.equal(notification.read, false);
  });

  it("listNotifications returns notifications for tenant", async () => {
    const mod = await import("../../notificationsRepository.js");
    const repo = mod.createNotificationsRepository({ tenantId: "tenant_1" });

    await repo.insertNotification({ userId: "user_1", title: "N1", message: "Msg 1", type: "info" });
    await repo.insertNotification({ userId: "user_1", title: "N2", message: "Msg 2", type: "warn" });

    const list = await repo.listNotifications({ userId: "user_1" });
    assert.equal(list.length, 2);
  });

  it("listNotifications filters by userId", async () => {
    const mod = await import("../../notificationsRepository.js");
    const repo = mod.createNotificationsRepository({ tenantId: "tenant_1" });

    await repo.insertNotification({ userId: "user_1", title: "N1", message: "Msg 1", type: "info" });
    await repo.insertNotification({ userId: "user_2", title: "N2", message: "Msg 2", type: "info" });

    const list = await repo.listNotifications({ userId: "user_1" });
    assert.equal(list.length, 1);
    assert.equal(list[0].userId, "user_1");
  });

  it("markAsRead sets read flag to true", async () => {
    const mod = await import("../../notificationsRepository.js");
    const repo = mod.createNotificationsRepository({ tenantId: "tenant_1" });

    const inserted = await repo.insertNotification({
      userId: "user_1",
      title: "Test",
      message: "Msg",
      type: "info",
    });

    await repo.markAsRead(inserted.id);
    const updated = await repo.listNotifications({ userId: "user_1" });
    assert.equal(updated[0].read, true);
  });

  it("markAllAsRead sets all user notifications to read", async () => {
    const mod = await import("../../notificationsRepository.js");
    const repo = mod.createNotificationsRepository({ tenantId: "tenant_1" });

    await repo.insertNotification({ userId: "user_1", title: "N1", message: "M1", type: "info" });
    await repo.insertNotification({ userId: "user_1", title: "N2", message: "M2", type: "warn" });
    await repo.insertNotification({ userId: "user_2", title: "N3", message: "M3", type: "info" });

    await repo.markAllAsRead({ userId: "user_1" });

    const user1List = await repo.listNotifications({ userId: "user_1" });
    assert.ok(user1List.every((n) => n.read === true), "all user_1 notifications should be read");

    const user2List = await repo.listNotifications({ userId: "user_2" });
    assert.equal(user2List[0].read, false, "other user notifications should remain unread");
  });

  it("listNotifications returns newest first", async () => {
    const mod = await import("../../notificationsRepository.js");
    const repo = mod.createNotificationsRepository({ tenantId: "tenant_1" });

    await repo.insertNotification({ userId: "user_1", title: "Older", message: "Older", type: "info" });
    await new Promise((r) => setTimeout(r, 10));
    await repo.insertNotification({ userId: "user_1", title: "Newer", message: "Newer", type: "info" });

    const list = await repo.listNotifications({ userId: "user_1" });
    assert.ok(new Date(list[0].createdAt) >= new Date(list[1].createdAt));
  });

  it("deleteNotification removes a notification", async () => {
    const mod = await import("../../notificationsRepository.js");
    const repo = mod.createNotificationsRepository({ tenantId: "tenant_1" });

    const inserted = await repo.insertNotification({
      userId: "user_1",
      title: "Delete me",
      message: "Msg",
      type: "info",
    });

    await repo.deleteNotification(inserted.id);

    const list = await repo.listNotifications({ userId: "user_1" });
    assert.equal(list.filter((n) => n.id === inserted.id).length, 0);
  });
});
