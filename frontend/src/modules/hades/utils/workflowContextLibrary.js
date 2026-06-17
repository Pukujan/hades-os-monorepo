export function buildWorkflowContextLibrary(raw) {
  if (!raw) {
    return { selected: [], sections: [], currentPageContext: null };
  }

  const documents = raw.documents || [];
  const textSpaces = raw.textSpaces || [];
  const selectedIds = raw.selectedContextIds || [];
  const pageContext = raw.pageContext || null;

  const sections = [];

  const resumes = documents.filter((d) => d.kind === "resume");
  if (resumes.length > 0) {
    sections.push({ id: "resumes", title: "Resumes", items: resumes });
  }

  const jobDescriptions = documents.filter((d) => d.kind === "job_description");
  if (jobDescriptions.length > 0) {
    sections.push({ id: "job_descriptions", title: "Job Descriptions", items: jobDescriptions });
  }

  const otherDocs = documents.filter(
    (d) => d.kind !== "resume" && d.kind !== "job_description"
  );
  if (otherDocs.length > 0) {
    sections.push({ id: "other_documents", title: "Other Documents", items: otherDocs });
  }

  if (textSpaces.length > 0) {
    sections.push({ id: "text_spaces", title: "Text Spaces", items: textSpaces });
  }

  const selected = [...documents, ...textSpaces].filter((item) =>
    selectedIds.includes(item.id)
  );

  return {
    selected: selected.map((item) => ({ id: item.id, name: item.name || item.title })),
    sections,
    currentPageContext: pageContext
      ? { url: pageContext.url, title: pageContext.title }
      : null,
  };
}
