import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadWorkflowExplanationUtils() {
  try {
    return await import("../../utils/workflowExplanation.js");
  } catch (error) {
    throw new Error(
      "Missing workflowExplanation.js. Expected frontend utilities for backend-provided markdown, Mermaid, guardrails, and workflow list summaries.",
      { cause: error }
    );
  }
}

async function loadExtensionWorkflowUtils() {
  try {
    return await import("../../utils/extensionWorkflowConsole.js");
  } catch (error) {
    throw new Error(
      "Missing extensionWorkflowConsole.js. Expected extension-facing helpers for chat, workflow list, uploads, text context spaces, page capture, and approvals.",
      { cause: error }
    );
  }
}

describe("workflow explanation frontend TDD contract", () => {
  test("normalizes backend-provided workflow explanation without mock preview data", async () => {
    const { normalizeWorkflowExplanation } = await loadWorkflowExplanationUtils();

    const explanation = normalizeWorkflowExplanation({
      shortDescription: "Tailors applications for one job at a time.",
      explanationMarkdown:
        "| Field | Value |\n| --- | --- |\n| Approval | Required before submit |",
      mermaidDiagram:
        "flowchart TD\n  A[Read job] --> B[Match profile]\n  B --> C[Draft resume]\n  C --> D{Approve?}",
      guardrailSummary: "Never submit without approval.",
      creationLog: "Hermes inferred a job-application workflow from Forge chat.",
    });

    assert.equal(explanation.shortDescription, "Tailors applications for one job at a time.");
    assert.equal(explanation.mermaidDirection, "TD");
    assert.equal(explanation.usesBackendExplanation, true);
  });

  test("rejects wide Mermaid diagrams for mobile workflow details", async () => {
    const { normalizeWorkflowExplanation } = await loadWorkflowExplanationUtils();

    const explanation = normalizeWorkflowExplanation({
      shortDescription: "Wide chart should be converted or rejected.",
      mermaidDiagram: "flowchart LR\n  A[Start] --> B[End]",
    });

    assert.equal(explanation.mermaidDirection, "TD");
    assert.equal(explanation.fallbackApplied, true);
  });

  test("maps workflow list rows from backend data rather than hardcoded minion previews", async () => {
    const { mapWorkflowListItem } = await loadWorkflowExplanationUtils();

    const item = mapWorkflowListItem({
      id: "wf_apply",
      name: "Targeted Job Application",
      status: "active",
      explanation: {
        shortDescription: "Reads one job and prepares tailored application materials.",
      },
      lastRun: {
        status: "approval_required",
        nextAction: "Review tailored resume before submit.",
      },
    });

    assert.deepEqual(item, {
      id: "wf_apply",
      title: "Targeted Job Application",
      description: "Reads one job and prepares tailored application materials.",
      status: "active",
      runStatus: "approval_required",
      nextAction: "Review tailored resume before submit.",
    });
  });

  test("builds extension console state from backend workflows, documents, text spaces, and page context", async () => {
    const { buildExtensionConsoleState } = await loadExtensionWorkflowUtils();

    const state = buildExtensionConsoleState({
      workflows: [
        {
          id: "wf_apply",
          name: "Targeted Job Application",
          explanation: { shortDescription: "Prepare one tailored application." },
        },
      ],
      documents: [{ id: "doc_resume", filename: "resume.pdf", kind: "resume" }],
      textContextSpaces: [{ id: "ctx_answers", title: "Saved application answers" }],
      pageContext: {
        url: "https://jobs.example/apply",
        title: "Software Engineer",
        selectedText: "React, Node, Playwright",
        formFields: [{ name: "first_name", type: "text" }],
      },
      approvals: [{ id: "approval_submit", status: "pending" }],
    });

    assert.equal(state.activeSurface, "browser-extension");
    assert.equal(state.workflows[0].id, "wf_apply");
    assert.equal(state.documents[0].filename, "resume.pdf");
    assert.equal(state.textContextSpaces[0].title, "Saved application answers");
    assert.equal(state.pageContext.formFields.length, 1);
    assert.equal(state.pendingApprovals.length, 1);
  });
});
