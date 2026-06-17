function stripHtmlTags(text) {
  return text.replace(/<[^>]*>/g, "");
}

function stripJavaScriptUrls(text) {
  return text.replace(/javascript:\s*/gi, "");
}

function stripMermaidClickActions(diagram) {
  return diagram.replace(/click\s+\S+.*/g, "");
}

export function sanitizeWorkflowExplanation({ markdown, mermaidDiagram } = {}) {
  let safeMarkdown = markdown || "";
  let safeMermaid = mermaidDiagram || "";

  safeMarkdown = stripHtmlTags(safeMarkdown);
  safeMarkdown = stripJavaScriptUrls(safeMarkdown);

  safeMermaid = stripMermaidClickActions(safeMermaid);
  safeMermaid = stripHtmlTags(safeMermaid);

  const stillHasUnsafe = /<script|javascript:|on\w+\s*=/.test(safeMarkdown);
  const stillHasUnsafeMermaid = /click\s+\S+\s+(javascript|http)/i.test(safeMermaid);

  return {
    markdown: safeMarkdown,
    mermaidDiagram: safeMermaid,
    safeToRender: !stillHasUnsafe && !stillHasUnsafeMermaid,
  };
}
