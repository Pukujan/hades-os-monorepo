import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HadesExtensionApp } from "./surfaces/HadesExtensionApp.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HadesExtensionApp />
  </StrictMode>
);
