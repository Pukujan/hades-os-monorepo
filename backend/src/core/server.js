import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";
import { logStartupSummary } from "./startup-log.js";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: join(backendRoot, ".env") });

const port = process.env.PORT || 3001;
const { app, loadedModules } = await createApp();

app.listen(port, () => {
  logStartupSummary(loadedModules, port);
});
