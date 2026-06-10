import React from "react";

const files = import.meta.glob("../modules/*/index.jsx", { eager: true });

function toRecord(mod) {
  const value = mod?.default || mod;
  if (!value || !value.route || !value.label || !value.Component) return null;
  return {
    route: value.route,
    label: value.label,
    Component: value.Component
  };
}

export const moduleRoutes = Object.entries(files)
  .filter(([path]) => !/\/modules\/_/.test(path))
  .map(([, mod]) => toRecord(mod))
  .filter(Boolean)
  .sort((a, b) => a.label.localeCompare(b.label));

export function EmptyModulePage() {
  return (
    <div>
      <h2>No modules yet</h2>
      <p>
        Add a module with: <strong>node scripts/new-module.mjs my-module --label "My Module"</strong>
      </p>
    </div>
  );
}

export function MissingPage() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>This route is not registered by any module.</p>
    </div>
  );
}
