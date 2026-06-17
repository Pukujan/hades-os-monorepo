export function createJobApplicationPlanner() {
  async function plan({ jobContext, profileContext, approvalPolicy } = {}) {
    const jobTitle = jobContext?.title || "Unknown position";
    const description = jobContext?.description || "";
    const facts = profileContext?.facts || [];

    const extracted = extractRequirements(description);
    const keywords = extractKeywords(description);
    const matchedFacts = facts.filter((f) =>
      keywords.some((kw) => f.toLowerCase().includes(kw.toLowerCase()))
    );

    const tailoredResume = generateResume(jobTitle, matchedFacts, description);
    const coverLetter = generateCoverLetter(jobTitle, facts, description);

    return {
      workflowType: "job_application",
      requirements: extracted,
      atsKeywords: keywords,
      matchedFacts,
      tailoredResume,
      coverLetter,
      profileDocumentIds: profileContext?.resumeDocumentIds || [],
      proposedActions: [
        { type: "fill_field", target: "resume" },
        { type: "attach_file", target: "resume" },
      ],
      approvalRequiredBeforeSubmit: approvalPolicy?.requireApprovalBeforeSubmit !== false,
    };
  }

  return { plan };
}

function extractRequirements(description) {
  if (!description) return [];
  return description
    .split(/[,.]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function extractKeywords(description) {
  if (!description) return [];
  const techWords = description.match(/\b[A-Z][a-zA-Z+#.]*\b/g) || [];
  return [...new Set(techWords)];
}

function generateResume(title, facts, _description) {
  const markdown = `# ${title}\n\n## Experience\n${
    facts.length > 0
      ? facts.map((f) => `- ${f}`).join("\n")
      : "- Relevant experience not specified"
  }\n`;
  return { markdown };
}

function generateCoverLetter(title, facts, _description) {
  const markdown = `Dear Hiring Manager,\n\nI am writing to express my interest in the ${title} position.\n\n${
    facts.length > 0
      ? `My background includes: ${facts.join(", ")}.`
      : "My background aligns well with this role."
  }\n\nI look forward to discussing how I can contribute.\n\nSincerely,\nApplicant`;
  return { markdown };
}
