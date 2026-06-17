import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEmojiForMinion } from "../utils/minionPreviewData.js";
import { buildForgeEditUrl } from "../utils/minionFlow.js";

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
  const [openTech, setOpenTech] = React.useState(false);
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
            <button className="action" type="button" onClick={() => navigate(buildForgeEditUrl(minion.id))}><strong>Edit minion</strong></button>
            <button className="action" type="button" onClick={() => navigate(`/app/minions/${minion.id}/logs`)}><strong>View logs</strong></button>
          </div>
        </div>

        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}><h2>Activity snapshot</h2></div>
          <div className="activity" id="activityList">
            <p className="task" style={{ margin: 0 }}>No recent activity.</p>
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
              Here. A test run. The result awaits your judgment.
            </div>
            <div className="chat-bubble hades">Send this test somewhere private?</div>
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
