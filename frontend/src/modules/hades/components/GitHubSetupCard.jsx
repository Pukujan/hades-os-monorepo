import React from "react";

const GITHUB_TOKEN_SETTINGS = "https://github.com/settings/tokens";

export function GitHubSetupCard({ connection, onSaveToken }) {
  const [token, setToken] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const status = connection?.status || "disconnected";
  const username = connection?.username || null;
  const scope = connection?.scope || null;

  function handleOpenTokenSettings() {
    window.open(GITHUB_TOKEN_SETTINGS, "_blank", "noopener,noreferrer");
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
        setError("Token invalid. Please check the GitHub personal access token and try again.");
      } else {
        setError(err?.message || "Failed to save token. Please try again.");
      }
    } finally {
      setTesting(false);
    }
  }

  if (status === "connected") {
    return (
      <article className="permission github-card" data-testid="github-card">
        <div className="social-main">
          <div className="avatar">{"\uD83D\uDC17"}</div>
          <div className="social-copy">
            <h4 className="name" style={{ whiteSpace: "nowrap" }}>GitHub</h4>
            <p className="task">
              Connected as {username || "GitHub User"} {scope ? `\u00B7 scope: ${scope}` : ""}
            </p>
          </div>
        </div>
        <div className="social-actions" data-testid="github-connected-actions">
          <button
            type="button"
            className="secondary"
            data-testid="github-connected-btn"
            onClick={handleOpenTokenSettings}
          >
            Manage repository access
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="permission github-card" data-testid="github-card">
      <div className="social-main">
        <div className="avatar">{"\uD83D\uDC17"}</div>
        <div className="social-copy">
          <h4 className="name" style={{ whiteSpace: "nowrap" }}>GitHub</h4>
          <p className="task">
            {status === "token_invalid"
              ? "Token invalid. Please check the GitHub personal access token and try again."
              : "Not connected"}
          </p>
        </div>
      </div>
      <div className="social-actions" data-testid="github-actions">
        <button
          type="button"
          className="secondary"
          data-testid="github-help-btn"
          onClick={handleOpenTokenSettings}
        >
          Open GitHub token settings
        </button>
        <div className="telegram-token-row" data-testid="github-token-row">
          <input
            type="password"
            aria-label="GitHub personal access token"
            placeholder="Paste GitHub personal access token"
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
            data-testid="github-save-btn"
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
