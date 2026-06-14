import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEmojiForMinion, getPreviewForMinion, getRecentLogsForMinion, MOCK_CONNECTED_DESTINATIONS } from "./minionPreviewData.js";

function ActiveSwitch({ minion, onActivate, onDeactivate }) {
  const isOn = minion.slotIndex != null;
  return (
    <div className="switch-wrap">
      <span className="tiny">{isOn ? "Active" : "Inactive"}</span>
      <button
        type="button"
        className={`toggle ${isOn ? "on" : ""}`}
        onClick={() => (isOn ? onDeactivate(minion.id) : onActivate(minion.id))}
        aria-label="Active switch"
      />
    </div>
  );
}

export function MinionDetailScreen({ minions, onActivate, onDeactivate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const minion = minions.find((m) => m.id === id) || minions[0];
  const preview = getPreviewForMinion(minion.id);
  const logs = getRecentLogsForMinion(minion.id, 6);
  const [openTech, setOpenTech] = React.useState(false);
  const [openFollowUp, setOpenFollowUp] = React.useState(false);
  const [openTestModal, setOpenTestModal] = React.useState(false);

  if (!minion) {
    return (
      <div className="scroll">
        <div className="card"><p className="task">Minion not found.</p></div>
      </div>
    );
  }

  const isManual = minion.type === "manual";
  const isActive = minion.slotIndex != null;

  return (
    <>
      <div className="scroll">
        <button className="back" type="button" onClick={() => navigate("/app/minions")}>← Back to slots</button>

        <div className="card">
          <div className="row">
            <div>
              <div className="tiny">{minion.source} minion · {minion.version}</div>
              <h2 className="title">{minion.name}</h2>
              <p className="hades-copy compact">{minion.description}</p>
            </div>
            <ActiveSwitch minion={minion} onActivate={onActivate} onDeactivate={onDeactivate} />
          </div>
        </div>

        {isManual ? (
          <div className="card">
            <div className="section-head" style={{ marginTop: 0 }}><h2>How to summon</h2><span className="chip">Manual</span></div>
            <div className="summon-box summon-main">
              <div className="summon-command">{minion.command}</div>
              <div className="desc">{minion.description}</div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="section-head" style={{ marginTop: 0 }}><h2>Auto schedule</h2><span className="chip">Auto</span></div>
            <div className="kv"><span>Interval</span><span>{minion.interval || "Not scheduled"}</span></div>
            <div className="kv"><span>Next run</span><span>{minion.nextRun || "No next run"}</span></div>
            <div className="kv"><span>Sends to</span><span>{destIcons(minion.destination)} {minion.destination}</span></div>
            <div className="mini-note">This runs even when you are not watching.</div>
          </div>
        )}

        {isManual && preview ? (
          <div className="card">
            <div className="section-head" style={{ marginTop: 0 }}><h2>Summon Preview</h2></div>
            <div className="preview-label">Example input</div>
            <div className="preview-input">{preview.exampleInput}</div>
            <div className="preview-output">
              <div className="hermes-output-head">
                <strong>Hermes output</strong>
                <span className="cache-chip">cached from current version</span>
              </div>
              <div className="output-artifact">{minion.id === "cat" ? "\u2696\uFE0F \uD83D\uDC31 \u00A7" : "\u2728"}</div>
              <div className="output-copy">{preview.outputText}</div>
            </div>

            {preview.followUp ? (
              <details className="details" open={openFollowUp} onToggle={(e) => setOpenFollowUp(e.target.open)}>
                <summary>Follow-up preview</summary>
                <div className="details-body">
                  <div className="preview-label">Follow-up input</div>
                  <div className="chat-bubble">{preview.followUp.input}</div>
                  <div className="preview-label">Hermes output</div>
                  <div className="chat-bubble hades">{preview.followUp.output}</div>
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        {!isManual && preview ? (
          <div className="card">
            <div className="section-head" style={{ marginTop: 0 }}><h2>Cached Hermes output</h2></div>
            <div className="auto-output-card">
              <strong>Example auto run</strong>
              <div className="output-copy">{preview.outputText}</div>
            </div>
          </div>
        ) : null}

        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}><h2>Minion Control</h2></div>
          <div className="action-grid">
            {isManual ? (
              <button className="action primary" type="button" onClick={() => setOpenTestModal(true)} disabled={!isActive}>
                <strong>Test run</strong>
              </button>
            ) : null}
            <button className="action primary" type="button" disabled={!isActive}>
              <strong>Manual summon</strong>
            </button>
            <button className="action" type="button"><strong>Edit minion</strong></button>
            <button className="action" type="button" onClick={() => navigate(`/app/minions/${minion.id}/logs`)}><strong>View logs</strong></button>
          </div>
        </div>

        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}><h2>Activity snapshot</h2><span className="tiny">Recent {logs.length}</span></div>
          <div className="activity" id="activityList">
            {logs.map((l) => (
              <div key={l.id} className="log-mini" onClick={() => navigate(`/app/minions/${minion.id}/logs`)}>
                <strong>{l.runType} · {l.destinationLabel}</strong>
                <p>{l.friendlyTime}</p>
              </div>
            ))}
            {!logs.length ? <p className="task" style={{ margin: 0 }}>No recent activity.</p> : null}
          </div>
        </div>

        <details className="details" open={openTech} onToggle={(e) => setOpenTech(e.target.open)}>
          <summary>Technical details</summary>
          <div className="details-body">
            <div className="kv"><span>Owner</span><span>{minion.ownerType === "system_default" ? "System" : "You"}</span></div>
            <div className="kv"><span>Type</span><span>{minion.type}</span></div>
            <div className="kv"><span>Destination</span><span>{minion.destination}</span></div>
            <div className="kv"><span>Version</span><span>{minion.version}</span></div>
            <div className="kv"><span>Slot</span><span>{isActive ? `Slot ${(minion.slotIndex || 0) + 1}` : "Inactive"}</span></div>
            <div className="kv"><span>Access</span><span>User scoped. Defaults fork before edit.</span></div>
          </div>
        </details>
      </div>

      {openTestModal ? (
        <div className="modal-backdrop" onClick={() => setOpenTestModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <div>
                <h2 className="title" style={{ fontSize: 20 }}>Test Run</h2>
                <p className="hades-copy">A private rehearsal. Nothing leaves the crypt unless you command it.</p>
              </div>
              <button className="pill-btn" type="button" onClick={() => setOpenTestModal(false)}>Close</button>
            </div>
            <div className="chat-bubble">{minion.exampleInput || minion.command}</div>
            <div className="chat-bubble hades">
              {preview?.outputText || "Here. A test run. The result awaits your judgment."}
            </div>
            <div className="chat-bubble hades">Send this test somewhere private?</div>
            <div className="destinations">
              {MOCK_CONNECTED_DESTINATIONS.filter((d) => d.connected).map((d) => (
                <button key={d.provider} className="dest" type="button" onClick={() => { setOpenTestModal(false); }}>
                  <span>{d.icon}</span>{d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function destIcons(dest) {
  if (!dest) return null;
  const d = dest.toLowerCase();
  if (d.includes("telegram")) return "\u2708\uFE0F";
  if (d.includes("discord")) return "\uD83D\uDCAC";
  if (d.includes("email") || d.includes("gmail")) return "\u2709\uFE0F";
  return "\u260D";
}
