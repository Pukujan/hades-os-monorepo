import React from "react";
import { useNavigate } from "react-router-dom";
import { getEmojiForMinion } from "./minionPreviewData.js";

export function MinionListScreen({ minions }) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");

  const filtered = minions.filter((m) =>
    (m.name + " " + (m.description || "")).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="scroll">
        <section className="card">
          <div className="list-top">
            <div>
              <h2 className="title">Minion List</h2>
              <p className="hades-copy">The whole cabinet of obedient nonsense.</p>
            </div>
            <button className="back" type="button" onClick={() => navigate("/app/minions")}>← Back</button>
          </div>
          <input
            className="search"
            placeholder="Search the lesser things..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid4">
            {filtered.slice(0, 16).map((m) => (
              <button key={m.id} type="button" className="minion-tile" onClick={() => navigate(`/app/minions/${m.id}`)}>
                <span className="owner">{m.ownerType === "user_owned" ? "User" : "Default"}</span>
                <div className="emoji">{getEmojiForMinion(m)}</div>
                <strong>{m.name}</strong>
                <small>{m.slotIndex != null ? "Active" : "Inactive"} · {m.type === "auto" ? "auto" : "manual"}</small>
              </button>
            ))}
          </div>
          {!filtered.length ? <p className="task" style={{ margin: "12px 0 0" }}>No minions match your search.</p> : null}
        </section>
      </div>
    </>
  );
}
