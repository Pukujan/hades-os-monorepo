import React from "react";
import { useNavigate } from "react-router-dom";
import { getLogsForMinion } from "./minionPreviewData.js";

function externalButton(log) {
  if (log.externalMessageUrl) {
    return (
      <a className="mini-link" href={log.externalMessageUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        {log.openLabel || "Open destination"}
      </a>
    );
  }
  return <span className="tiny">No external jump available</span>;
}

export function MinionLogsScreen({ minion, logs: initialLogs, onBack }) {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState("current");
  const [dateFilter, setDateFilter] = React.useState("");

  const logs = filter === "all" ? getLogsForMinion() : initialLogs;
  const filteredByDate = dateFilter
    ? logs.filter((l) => l.exactTimestamp && l.exactTimestamp.startsWith(dateFilter))
    : logs;

  const groups = {};
  for (const l of filteredByDate) {
    (groups[l.dateGroup] ||= []).push(l);
  }

  const handleLogClick = (logId) => {
    const el = document.getElementById(`log-${logId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <div className="scroll">
        <button className="back" type="button" onClick={onBack}>← Back to minion</button>
        <div className="card">
          <div className="row">
            <div>
              <h2 className="title">Run Logs</h2>
              <p className="hades-copy">A dated ledger of what the minions disturbed.</p>
            </div>
            <span className="chip" id="logScopeChip">{minion?.name || "All minions"}</span>
          </div>
          <div className="log-tools">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="current">This minion</option>
              <option value="all">All minions</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="date-input"
              placeholder="Filter by date"
            />
            {dateFilter ? <button className="tiny" type="button" onClick={() => setDateFilter("")}>Clear</button> : null}
          </div>
          <div id="fullLogs">
            {Object.entries(groups).map(([date, items]) => (
              <div key={date}>
                <div className="date-head">{date}</div>
                {items.map((l) => (
                  <div
                    key={l.id}
                    id={`log-${l.id}`}
                    className="log-row"
                    tabIndex={0}
                    onClick={() => handleLogClick(l.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogClick(l.id); }}
                  >
                    <strong>{l.minionName} · {l.runType} · {l.status}</strong>
                    <p>
                      {l.exactTimestamp}<br />
                      {l.destinationLabel}<br />
                      {l.summary}<br />
                      <span className="tiny">{l.version} · owner: {l.owner}</span>
                    </p>
                    <div className="log-actions">{externalButton(l)}</div>
                  </div>
                ))}
              </div>
            ))}
            {!filteredByDate.length ? <p className="task" style={{ marginTop: 12 }}>No logs for this filter.</p> : null}
          </div>
        </div>
      </div>
    </>
  );
}
