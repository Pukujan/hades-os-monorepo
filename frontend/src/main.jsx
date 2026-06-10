import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import "./styles/hades.css";
import { App } from "./core/App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
