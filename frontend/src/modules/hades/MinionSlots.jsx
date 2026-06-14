import React from "react";
import { useNavigate } from "react-router-dom";
import { getEmojiForMinion } from "./minionPreviewData.js";

export function MinionSlots({ minions, maxSlots = 4 }) {
  const navigate = useNavigate();
  const activeInSlots = minions.filter((m) => m.slotIndex != null).sort((a, b) => a.slotIndex - b.slotIndex).slice(0, maxSlots);

  return (
    <div className="grid4" id="slots">
      {Array.from({ length: maxSlots }, (_, i) => {
        const m = activeInSlots.find((x) => x.slotIndex === i);
        if (m) {
          return (
            <button key={m.id} type="button" className="slot filled" onClick={() => navigate(`/app/minions/${m.id}`)}>
              <div className="emoji">{getEmojiForMinion(m)}</div>
              <strong>{m.name}</strong>
              <small>{m.type === "auto" ? "auto" : "manual"}</small>
            </button>
          );
        }
        return (
          <button key={`empty-${i}`} type="button" className="slot empty" onClick={() => navigate("/app/minions/list")}>
            <div className="emoji">＋</div>
            <strong>Empty Slot</strong>
            <small>add minion</small>
          </button>
        );
      })}
    </div>
  );
}
