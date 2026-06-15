import { randomUUID } from "crypto";

function nowIso() {
  return new Date().toISOString();
}

export function createNotificationsRepository({ tenantId } = {}) {
  const notifications = [];

  async function insertNotification({ userId, title, message, type } = {}) {
    const entry = {
      id: randomUUID().slice(0, 8),
      userId,
      title,
      message,
      type,
      read: false,
      tenantId,
      createdAt: nowIso(),
    };
    notifications.push(entry);
    return { ...entry };
  }

  async function listNotifications({ userId } = {}) {
    let filtered = notifications;
    if (userId) {
      filtered = filtered.filter((n) => n.userId === userId);
    }
    return filtered
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((n) => ({ ...n }));
  }

  async function markAsRead(id) {
    const entry = notifications.find((n) => n.id === id);
    if (entry) {
      entry.read = true;
    }
  }

  async function markAllAsRead({ userId } = {}) {
    for (const n of notifications) {
      if (n.userId === userId) {
        n.read = true;
      }
    }
  }

  async function deleteNotification(id) {
    const index = notifications.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.splice(index, 1);
    }
  }

  return {
    insertNotification,
    listNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
