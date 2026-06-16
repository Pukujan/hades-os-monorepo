export function getEmojiForMinion(minion) {
  return minion?.emoji || "🐱";
}

export function getPreviewForMinion(minionId) {
  return MOCK_PREVIEWS[minionId] || null;
}

export function getLogsForMinion(minionId) {
  if (!minionId) return MOCK_LOGS;
  return MOCK_LOGS.filter((l) => l.minionId === minionId);
}

export function getRecentLogsForMinion(minionId, count = 6) {
  return getLogsForMinion(minionId).slice(0, count);
}
