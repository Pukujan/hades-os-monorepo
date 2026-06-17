export function normalizeSocialCommandName(content = "") {
  const trimmed = String(content || "").trim();
  if (!trimmed) return null;

  const [firstToken] = trimmed.split(/\s+/);
  if (!firstToken) return null;

  const bare = firstToken.replace(/^[!/]+/, "").trim().toLowerCase();
  if (!bare) return null;

  return `!${bare}`;
}

export function findMinionByCommand(content, minions = []) {
  const normalized = normalizeSocialCommandName(content);
  if (!normalized) return null;

  return (
    minions.find(
      (minion) => normalizeSocialCommandName(minion?.commandName || minion?.command_name) === normalized
    ) || null
  );
}
