import React from "react";

const DISCORD_DEV_PORTAL = "https://discord.com/developers/applications";

export function DiscordSetupCard({ connection, onSaveToken }) {
  const [token, setToken] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const status = connection?.status || "disconnected";
  const botUsername = connection?.botUsername || connection?.bot_username || null;
  const tokenLast4 = connection?.tokenLast4 || connection?.token_last4 || null;

  function handleOpenDevPortal() {
    window.open(DISCORD_DEV_PORTAL, "_blank", "noopener,noreferrer");
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
        setError("Token invalid. Please check the Discord bot token and try again.");
      } else {
        setError(err?.message || "Failed to save token. Please try again.");
      }
    } finally {
      setTesting(false);
    }
  }

  if (status === "connected") {
    return (
      <article className="permission discord-card" data-testid="discord-card">
        <div className="social-main">
          <div className="avatar">{"\uD83D\uDCAC"}</div>
          <div className="social-copy">
            <h4 className="name" style={{ whiteSpace: "nowrap" }}>Discord</h4>
            <p className="task">
              {botUsername ? `Connected to ${botUsername}` : "Connected"} {tokenLast4 ? `\u00B7 ${tokenLast4}` : ""}
            </p>
          </div>
        </div>
        <div className="social-actions" data-testid="discord-connected-actions">
          <button
            type="button"
            className="secondary"
            data-testid="discord-connected-btn"
            onClick={handleOpenDevPortal}
          >
            Configure server setup
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="permission discord-card" data-testid="discord-card">
      <div className="social-main">
        <div className="avatar">{"\uD83D\uDCAC"}</div>
        <div className="social-copy">
          <h4 className="name" style={{ whiteSpace: "nowrap" }}>Discord</h4>
          <p className="task">
            {status === "token_invalid"
              ? "Token invalid. Please check the Discord bot token and try again."
              : "Not connected"}
          </p>
        </div>
      </div>
      <div className="social-actions" data-testid="discord-actions">
        <button
          type="button"
          className="secondary"
          data-testid="discord-help-btn"
          onClick={handleOpenDevPortal}
        >
          Open Discord Developer Portal
        </button>
        <div className="telegram-token-row" data-testid="discord-token-row">
          <input
            type="password"
            aria-label="Discord bot token"
            placeholder="Paste Discord bot token"
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
            data-testid="discord-save-btn"
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
