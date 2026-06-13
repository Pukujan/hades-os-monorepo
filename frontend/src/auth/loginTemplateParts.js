export function extractLoginTemplateParts(template) {
  const source = String(template || "");
  const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = source.match(/<body>([\s\S]*?)<\/body>/i);
  const frames = [...source.matchAll(/<img class="bg-frame[^"]*" src="(data:image\/png;base64,[^"]+)"/gi)].map((match) => match[1]);

  return {
    style: styleMatch?.[1]?.trim() || "",
    body: bodyMatch?.[1]?.replace(/<script[\s\S]*<\/script>\s*$/i, "").trim() || "",
    frames
  };
}
