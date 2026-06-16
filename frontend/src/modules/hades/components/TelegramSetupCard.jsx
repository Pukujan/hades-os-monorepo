import React from "react";
import { buildBotFatherCommand, buildBotFatherPrivacyInstructions, formatTokenDisplay } from "../services/telegramSetup.js";

const BOTFATHER_URL = "https://t.me/BotFather";

export function TelegramSetupCard({ connection, currentUser, onSaveToken }) {
  const [token, setToken] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const status = connection?.status || "disconnected";
  const botUsername = connection?.bot_username || connection?.botUsername || null;
  const tokenLast4 = connection?.token_last4 || connection?.tokenLast4 || null;

  async function handleCopyAndOpen() {
    const username = currentUser?.username || currentUser?.id || null;
    const command = buildBotFatherCommand(username);
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard not available
    }
    window.open(BOTFATHER_URL, "_blank", "noopener,noreferrer");
  }

  async function handleCopyPrivacyInstructions() {
    const instructions = buildBotFatherPrivacyInstructions(botUsername);
    try {
      await navigator.clipboard.writeText(instructions);
    } catch {
      // Clipboard not available
    }
    window.open(BOTFATHER_URL, "_blank", "noopener,noreferrer");
  }

  async function handleSave() {
    if (!token.trim()) return;
    setTesting(true);
    setError(null);
    try {
      await onSaveToken({ token: token.trim() });
      setToken("");
    } catch (err) {
      const code = err?.code || err?.error?.code || "";
      if (code === "token_invalid") {
        setError("Token invalid. Please check the BotFather token and try again.");
      } else {
        setError(err?.message || "Failed to save token. Please try again.");
      }
    } finally {
      setTesting(false);
    }
  }

  if (status === "connected") {
    const instructions = buildBotFatherPrivacyInstructions(botUsername);
    return (
      <article className="permission telegram-card" data-testid="telegram-card">
        <div className="social-main">
          <div className="avatar">{"\u2709"}</div>
          <div className="social-copy">
            <h4 className="name" style={{ whiteSpace: "nowrap" }}>Telegram</h4>
            <p className="task">
              Connected to {botUsername ? `@${botUsername}` : "Telegram"} &middot;{" "}
              {tokenLast4 ? formatTokenDisplay(tokenLast4) : ""}
            </p>
          </div>
        </div>
        <div className="social-actions" data-testid="telegram-connected-actions">
          <button
            type="button"
            className="secondary"
            data-testid="telegram-privacy-btn"
            onClick={handleCopyPrivacyInstructions}
          >
            Configure group chat access
          </button>
          <p className="instructions" data-testid="telegram-privacy-instructions" style={{ whiteSpace: "pre-wrap", fontSize: "0.85em", marginTop: "8px" }}>
            {instructions}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="permission telegram-card" data-testid="telegram-card">
      <div className="social-main">
        <div className="avatar">{"\u2709"}</div>
        <div className="social-copy">
          <h4 className="name" style={{ whiteSpace: "nowrap" }}>Telegram</h4>
          <p className="task">
            {status === "token_invalid"
              ? "Token invalid. Please check the BotFather token and try again."
              : "Not connected"}
          </p>
        </div>
      </div>
      <div className="social-actions" data-testid="telegram-actions">
        <button
          type="button"
          className="secondary telegram-command-button"
          onClick={handleCopyAndOpen}
        >
          Copy setup command &amp; open BotFather
        </button>
        <div className="telegram-token-row" data-testid="telegram-token-row">
          <input
            type="password"
            aria-label="BotFather token"
            placeholder="Paste BotFather token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError(null);
            }}
            disabled={testing}
          />
          <button
            type="button"
            className="primary"
            onClick={handleSave}
            disabled={testing || !token.trim()}
          >
            {testing ? "Testing..." : "Test & Save"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </article>
  );
}
