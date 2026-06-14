export function validateGeneralChatScope(response) {
  const text = JSON.stringify(response || {}).toLowerCase();

  const forgeLeakPatterns = [
    "tell me what kind of minion",
    "welcome to the forge",
    "draftminion",
    "draft minion",
    "approvalrequired",
    "save this minion",
  ];

  const leak = forgeLeakPatterns.find((pattern) => text.includes(pattern));

  if (leak) {
    return {
      ok: false,
      code: "forge_leak_in_general_chat",
      pattern: leak,
    };
  }

  return { ok: true };
}

export function guardGeneralChatScope(response) {
  const validation = validateGeneralChatScope(response);

  if (validation.ok) return response;

  return {
    reply: "Forge matter. Wrong room.",
    actions: [
      {
        label: "Open Forge",
        route: "/app/forge",
      },
    ],
    guard: {
      code: validation.code,
      pattern: validation.pattern,
    },
  };
}
