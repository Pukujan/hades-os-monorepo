import React from "react";
import { THEME_CHOICES } from "../../modules/hades/hadesData.js";
import { useHades } from "../../modules/hades/pages/HadesPrototypeApp.jsx";

function AppIcon({ name, className = "", size = 18, strokeWidth = 2.2, title }) {
  return <span className={className}>{name}</span>;
}

function ScreenHeader({ icon, title, subtitle, actionLabel, onAction }) {
  const { toggleNotificationDropdown, theme, setTheme } = useHades();
  const themeIndex = THEME_CHOICES.findIndex((choice) => choice.id === theme);
  const nextTheme = THEME_CHOICES[(themeIndex + 1) % THEME_CHOICES.length];

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><AppIcon name={icon} size={20} strokeWidth={2.4} /></div>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="top-actions">
        <button className="theme-btn" type="button" onClick={() => setTheme(nextTheme.id)}>
          {nextTheme.label}
        </button>
        <button className="icon-btn" type="button" onClick={toggleNotificationDropdown} aria-label="Toggle notifications">
          <AppIcon name="inbox" size={16} />
        </button>
        {actionLabel ? (
          <button className="tiny-btn" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
}
