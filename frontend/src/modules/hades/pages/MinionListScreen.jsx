import React from "react";
import { useNavigate } from "react-router-dom";
import { getEmojiForMinion } from "../utils/minionPreviewData.js";
import { paginateMinions } from "../utils/minionFlow.js";

export function MinionListScreen({ minions }) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);

  const filtered = minions.filter((m) =>
    (m.name + " " + (m.description || "")).toLowerCase().includes(search.toLowerCase())
  );
  const { visibleMinions, hasPrevious, hasNext, totalPages, page: currentPage } = paginateMinions(filtered, page, 10);

  React.useEffect(() => {
    setPage(0);
  }, [search]);

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
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="tiny">Page {currentPage + 1} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="pill-btn" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={!hasPrevious}>
                Previous
              </button>
              <button className="pill-btn" type="button" onClick={() => setPage((current) => current + 1)} disabled={!hasNext}>
                Next
              </button>
            </div>
          </div>
          <div className="grid4">
            {visibleMinions.map((m) => (
              <button key={m.id} type="button" className="minion-tile" onClick={() => navigate(`/app/minions/${m.id}`)}>
                <span className="owner">User</span>
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
