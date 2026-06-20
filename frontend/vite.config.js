import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
  const isAnalyze = process.env.ANALYZE === "true";
  const plugins = [react()];

  if (isAnalyze) {
    const { visualizer } = await import("rollup-plugin-visualizer");
    plugins.push(
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats-treemap.html",
      }),
      visualizer({
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats-raw-data.json",
        template: "raw-data",
      }),
    );
  }

  return {
    plugins,
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
    },
  };
});

