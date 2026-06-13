const SECRET_FIELD_PATTERNS = [
  /encrypted_bot_token/i,
  /bot_token/i,
  /decrypted_token/i,
  /api_key/i,
  /secret/i,
];

function hasSecretField(obj) {
  if (!obj || typeof obj !== "object") return false;
  for (const key of Object.keys(obj)) {
    if (SECRET_FIELD_PATTERNS.some((p) => p.test(key))) return true;
    if (typeof obj[key] === "object" && hasSecretField(obj[key])) return true;
  }
  return false;
}

export function validateHermesOutput({ output, authContext, assignment, allowedActions = [] }) {
  const actions = output?.outboundActions || [];

  for (const action of actions) {
    if (!allowedActions.includes(action.type)) {
      return { ok: false, code: "invalid_hermes_output", reason: "unknown_action_type" };
    }

    if (action.type === "send_message" && !action.content) {
      return { ok: false, code: "invalid_hermes_output", reason: "missing_content" };
    }

    if (action.provider && assignment?.provider && action.provider !== assignment.provider) {
      return { ok: false, code: "invalid_hermes_output", reason: "provider_mismatch" };
    }

    if (action.channelId && assignment?.channel_id && action.channelId !== assignment.channel_id) {
      return { ok: false, code: "invalid_hermes_output", reason: "channel_mismatch" };
    }

    if (hasSecretField(action)) {
      return { ok: false, code: "invalid_hermes_output", reason: "secret_field_detected" };
    }
  }

  return { ok: true };
}
