import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadModules } from "./module-loader.js";
import { logStartupSummary } from "./startup-log.js";
import { errorHandler } from "../shared/http/errors.js";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: join(backendRoot, ".env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const loadedModules = await loadModules(app);

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", loadedAt: new Date().toISOString() });
});

app.use(errorHandler);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  logStartupSummary(loadedModules, port);
});
