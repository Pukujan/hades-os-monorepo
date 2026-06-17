import React from "react";
import { createRoot } from "react-dom/client";
import { HadesExtensionApp } from "./surfaces/HadesExtensionApp.jsx";

const root = createRoot(document.getElementById("root"));
root.render(React.createElement(React.StrictMode, null, React.createElement(HadesExtensionApp)));
