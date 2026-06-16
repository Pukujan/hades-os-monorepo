import { transformSync } from "esbuild";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

export function resolve(specifier, context, nextResolve) {
  if (extname(specifier) === ".jsx") {
    return {
      shortCircuit: true,
      url: new URL(specifier, context.parentURL).href,
      format: "module",
    };
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const source = readFileSync(new URL(url), "utf8");
    const { code } = transformSync(source, {
      loader: "jsx",
      jsx: "automatic",
      sourcemap: "inline",
    });
    return { format: "module", source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
