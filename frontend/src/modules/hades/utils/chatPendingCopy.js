export function getPendingCopy(message, conversationType) {
  const text = String(message || "").toLowerCase();

  if (conversationType === "forge") {
    if (
      text.includes("test") ||
      text.includes("simulate") ||
      text.includes("try")
    ) {
      return "Testing the minion.";
    }
    if (
      text.includes("save") ||
      text.includes("keep") ||
      text.includes("store")
    ) {
      return "Binding the minion.";
    }
    return "Heating the forge.";
  }

  if (
    text.includes("price") ||
    text.includes("cheapest") ||
    text.includes("buy") ||
    text.includes("internet") ||
    text.includes("listing")
  ) {
    return "Searching prices...";
  }

  if (
    text.includes("github") ||
    text.includes("telegram") ||
    text.includes("discord") ||
    text.includes("connect")
  ) {
    return "Checking the wire...";
  }

  return "Hades is thinking.";
}

export function getFallbackPendingCopy(conversationType) {
  if (conversationType === "forge") {
    return "Heating the forge.";
  }
  return "Hades is thinking.";
}
