import assert from "node:assert/strict";
import { describe, test } from "node:test";

async function loadModule(path, message) {
  try {
    return await import(path);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") {
      throw error;
    }
    throw new Error(message);
  }
}

describe("Hades workflow frontend build phases TDD contract", () => {
  test("phase 9 and 10: workflow detail renders backend Markdown and mobile-first Mermaid safely", async () => {
    const { buildWorkflowDetailViewModel } = await loadModule(
      "../../utils/workflowDetailViewModel.js",
      "Missing workflowDetailViewModel.js. Expected backend-owned Markdown/Mermaid workflow detail view model.",
    );

    const viewModel = buildWorkflowDetailViewModel({
      workflow: {
        id: "wf-job",
        name: "Targeted job application",
        explanation: {
          shortDescription: "Tailors a resume and cover letter for one job.",
          markdownTable: "| Step | Output |\n| --- | --- |\n| Match | ATS keywords |",
          mermaidDiagram: "flowchart LR\nA[Read job] --> B[Tailor resume]",
          guardrailSummary: "Requires approval before submit.",
        },
      },
      latestRun: {
        status: "approval_required",
        auditEntries: [{ toolName: "browser.fillForm", status: "paused_for_approval" }],
      },
    });

    assert.equal(viewModel.title, "Targeted job application");
    assert.equal(viewModel.markdownBlocks.some((block) => block.kind === "table"), true);
    assert.equal(viewModel.mermaid.direction, "TD");
    assert.equal(viewModel.mermaid.fallbackApplied, true);
    assert.equal(viewModel.approvalBanner.visible, true);
  });

  test("phase 10: renderer contract strips unsafe Markdown and Mermaid content before display", async () => {
    const { sanitizeWorkflowExplanation } = await loadModule(
      "../../utils/workflowExplanationRenderer.js",
      "Missing workflowExplanationRenderer.js. Expected safe Markdown and Mermaid sanitization helpers.",
    );

    const sanitized = sanitizeWorkflowExplanation({
      markdown: "Hello<script>alert('x')</script>\n[bad](javascript:alert(1))",
      mermaidDiagram: "flowchart TD\nA[Safe] --> B[Next]\nclick A javascript:alert(1)",
    });

    assert.doesNotMatch(sanitized.markdown, /script/i);
    assert.doesNotMatch(sanitized.markdown, /javascript:/i);
    assert.doesNotMatch(sanitized.mermaidDiagram, /click\s+A/i);
    assert.equal(sanitized.safeToRender, true);
  });

  test("phase 11: context library view model merges resumes, PDFs, text spaces, and selected page context", async () => {
    const { buildWorkflowContextLibrary } = await loadModule(
      "../../utils/workflowContextLibrary.js",
      "Missing workflowContextLibrary.js. Expected shared main-app/extension context library helpers.",
    );

    const library = buildWorkflowContextLibrary({
      documents: [
        { id: "doc-resume", kind: "resume", name: "Main resume.pdf" },
        { id: "doc-job", kind: "job_description", name: "Job post.pdf" },
      ],
      textSpaces: [{ id: "text-about-me", title: "About me", tokenEstimate: 400 }],
      pageContext: { url: "https://jobs.example.test/apply", title: "Apply now" },
      selectedContextIds: ["doc-resume", "text-about-me"],
    });

    assert.deepEqual(library.selected.map((item) => item.id), ["doc-resume", "text-about-me"]);
    assert.equal(library.sections.some((section) => section.id === "resumes"), true);
    assert.equal(library.sections.some((section) => section.id === "text_spaces"), true);
    assert.equal(library.currentPageContext.url, "https://jobs.example.test/apply");
  });

  test("phase 11 and 12: workflow CRUD payloads are backend-driven and include key-scoped extension surfaces", async () => {
    const { buildWorkflowCrudPayload, buildExtensionKeySettingsView } = await loadModule(
      "../../utils/workflowCrudContracts.js",
      "Missing workflowCrudContracts.js. Expected workflow CRUD and extension key settings contracts.",
    );

    const payload = buildWorkflowCrudPayload({
      name: "Apply to one job",
      goal: "Tailor my resume and cover letter, then fill the form after approval.",
      prompt: "Use selected resume and current page.",
      guardrails: ["Never submit without approval"],
      selectedContextIds: ["doc-resume", "text-about-me"],
      allowedTools: ["memory.searchProfileContext", "browser.proposeFormActions"],
    });

    assert.equal(payload.kind, "workflow");
    assert.deepEqual(payload.requiredContextIds, ["doc-resume", "text-about-me"]);
    assert.equal(payload.previewSource, "backend");
    assert.equal(Object.hasOwn(payload, "hardcodedMinionPreview"), false);

    const keySettings = buildExtensionKeySettingsView({
      keys: [
        {
          id: "key-1",
          name: "Chrome extension",
          scopes: ["workflow:read", "document:upload", "approval:create"],
          revokedAt: null,
        },
      ],
    });

    assert.equal(keySettings.rows[0].canRotate, true);
    assert.equal(keySettings.rows[0].canRevoke, true);
    assert.equal(keySettings.rows[0].secretVisible, false);
  });
});
