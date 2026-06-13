import React from "react";
import { useNavigate } from "react-router-dom";
import {
  STARTER_MINIONS,
  STARTER_PROMPTS,
  formatSocialLabel
} from "../../modules/hades/hadesData.js";
import { useHades } from "../../modules/hades/HadesPrototypeApp.jsx";

function AppIcon({ name, className = "", size = 18, strokeWidth = 2.2, title }) {
  return <span className={className}>{name}</span>;
}

function ScreenHead({ title, subtitle }) {
  return (
    <div className="screen-head">
      <div>
        <h2 className="screen-title">{title}</h2>
        <p className="screen-sub">{subtitle}</p>
      </div>
    </div>
  );
}

function Bubble({ message }) {
  const className = `bubble ${message.role === "user" ? "user" : "hermes"} ${message.status === "queued" ? "pending" : ""}`;
  return (
    <div className={className}>
      <span dangerouslySetInnerHTML={{ __html: message.content }} />
    </div>
  );
}

function HomeScreen() {
  const { messages, selectStarterCard, sendMessage, selectedStarterId } = useHades();
  const navigate = useNavigate();

  return (
    <>
      <ScreenHead title="Minions" subtitle="Speak to Hades, then inspect your minions and slots." />
      <section className="card chat-card" id="hadesChatCard">
        <p className="kicker">Speak to Hades</p>
        <h3 className="bigline chat-intro">Hades awaits your message.</h3>
        <div className="chat-wrap" id="homeChat">
          {messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}
        </div>
        <div className="suggest">
          {STARTER_PROMPTS.map((prompt) => (
            <button key={prompt.id} className="chip" type="button" onClick={() => sendMessage(prompt.text)}>
              {prompt.label}
            </button>
          ))}
        </div>
        <div className="input-row">
          <textarea
            className="input"
            rows={1}
            value={""}
            placeholder="Speak thy mind..."
            onChange={() => {}}
          />
          <button className="primary" type="button" onClick={() => sendMessage("I want a helper")}>
            Send
          </button>
        </div>
      </section>

      <div className="section-row">
        <h3>Your Minions</h3>
        <button className="tiny" type="button" onClick={() => navigate("/app/minions")}>View all</button>
      </div>
      <div className="tabs">
        <button type="button" className="tab active">
          ACTIVE
        </button>
        <button type="button" className="tab">
          INACTIVE
        </button>
      </div>
      <section className="minions-pane">
        <div className="contained-list" id="activeMinions">
          {STARTER_MINIONS.filter((starter) => starter.status !== "locked").map((starter) => (
            <article key={starter.id} className="minion-card">
              <div className="avatar">
                <span>{starter.icon}</span>
              </div>
              <div>
                <h4 className="name">{starter.name}</h4>
                <p className="task">{starter.description}</p>
                <div className="meta-mini">
                  <span className="meta-pill">{starter.commandName || "!hades"}</span>
                  <span className="meta-pill">{formatSocialLabel(starter.targetSocial)}</span>
                </div>
              </div>
              <button className="detail-btn" type="button" onClick={() => selectStarterCard(starter.id)}>
                Detail
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="section-row">
        <h3>Minion Slots</h3>
        <button className="tiny" type="button" onClick={() => navigate("/forge")}>Upgrade</button>
      </div>
      <div className="slots">
        <div className="slot filled">Cat<br />Courier</div>
        <div className="slot filled">Price<br />Imp</div>
        <div className="slot filled">Scroll<br />Reader</div>
        <div className="slot">Empty<br />Slot</div>
      </div>
    </>
  );
}
