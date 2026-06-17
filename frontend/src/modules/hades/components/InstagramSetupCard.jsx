import React from "react";

export function InstagramSetupCard({ connection, currentUser, onCreateAuthLink, onSaveConnection, onDeleteConnection }) {
  const status = connection?.status || "not_connected";
  const handle = connection?.handle || null;
  const connector = connection?.connector || "Composio";

  async function handleConnect() {
    try {
      await onCreateAuthLink({
        connector: "composio",
        requestedScopes: ["instagram.dm.read", "instagram.dm.send"],
      });
    } catch {
      // best-effort
    }
  }

  async function handleDisconnect() {
    try {
      await onDeleteConnection();
    } catch {
      // best-effort
    }
  }

  if (status === "connected") {
    return (
      <article className="permission instagram-card" data-testid="instagram-card">
        <div className="social-main">
          <div className="avatar">{"\uD83D\uDCF7"}</div>
          <div className="social-copy">
            <h4 className="name" style={{ whiteSpace: "nowrap" }}>Instagram</h4>
            <p className="task">
              Connected as {handle || "Instagram User"} {"\u00B7"} {connector}
            </p>
          </div>
        </div>
        <div className="social-actions" data-testid="instagram-connected-actions">
          <button type="button" className="secondary" data-testid="instagram-disconnect-btn" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="permission instagram-card" data-testid="instagram-card">
      <div className="social-main">
        <div className="avatar">{"\uD83D\uDCF7"}</div>
        <div className="social-copy">
          <h4 className="name" style={{ whiteSpace: "nowrap" }}>Instagram</h4>
          <p className="task">
            Not connected {"\u00B7"} {connector}
          </p>
        </div>
      </div>
      <div className="social-actions" data-testid="instagram-actions">
        <button type="button" className="primary" data-testid="instagram-connect-btn" onClick={handleConnect}>
          Connect Instagram
        </button>
      </div>
      <div className="social-footer">
        <p>Instagram DM sends require approval by default.</p>
      </div>
    </article>
  );
}

export default InstagramSetupCard;
