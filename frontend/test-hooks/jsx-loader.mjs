import { transformSync } from "esbuild";

export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  if (resolved.url.endsWith(".jsx")) {
    return { ...resolved, format: "module" };
  }
  return resolved;
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (url.endsWith(".jsx")) {
    const { code } = transformSync(result.source.toString(), {
      loader: "jsx",
      jsx: "automatic",
      sourcemap: "inline",
    });
    return { format: "module", source: code };
  }
  return result;
}
