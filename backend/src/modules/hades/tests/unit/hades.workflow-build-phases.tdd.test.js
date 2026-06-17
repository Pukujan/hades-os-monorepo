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

describe("Hermes workflow build phases TDD contract", () => {
  test("phase 4: internal memory and document tools are scoped and available through the tool registry", async () => {
    const { createMemoryDocumentTools } = await loadModule(
      "../../workflows/memoryDocumentTools.js",
      "Missing memoryDocumentTools.js. Expected scoped profile/document/artifact tools for workflows.",
    );
    const { createToolRegistry } = await loadModule(
      "../../workflows/toolRegistry.js",
      "Missing toolRegistry.js. Expected a permission-aware registry for workflow tools.",
    );

    const calls = [];
    const tools = createMemoryDocumentTools({
      memoryRepository: {
        search: async (query) => {
          calls.push(query);
          return [{ id: "mem-1", text: "Senior full-stack engineer" }];
        },
      },
      documentRepository: {
        getText: async (query) => {
          calls.push(query);
          return "Resume PDF text";
        },
      },
      artifactRepository: {
        save: async (artifact) => ({ id: "artifact-1", ...artifact }),
      },
    });

    const registry = createToolRegistry({ authContext: { userId: "user-a", tenantId: "tenant-a" } });
    registry.registerMany(tools);

    const searchTool = registry.get("memory.searchProfileContext");
    assert.equal(searchTool.requiresApproval, false);
    assert.deepEqual(
      await searchTool.execute({ query: "resume", userId: "user-b", tenantId: "tenant-b" }),
      [{ id: "mem-1", text: "Senior full-stack engineer" }],
    );
    assert.deepEqual(calls[0], { query: "resume", userId: "user-a", tenantId: "tenant-a" });
  });

  test("phase 5: job application planner creates requirements, ATS mapping, tailored resume, and cover letter artifacts", async () => {
    const { createJobApplicationPlanner } = await loadModule(
      "../../workflows/jobApplicationPlanner.js",
      "Missing jobApplicationPlanner.js. Expected targeted job workflow planning and artifact drafting.",
    );

    const planner = createJobApplicationPlanner();
    const plan = await planner.plan({
      jobContext: {
        title: "Senior Frontend Engineer",
        description: "React, accessibility, Playwright, API integration, ownership",
      },
      profileContext: {
        facts: ["Built React apps", "Led accessibility work", "Created Playwright tests"],
        resumeDocumentIds: ["resume-main"],
      },
      approvalPolicy: { requireApprovalBeforeSubmit: true },
    });

    assert.equal(plan.workflowType, "job_application");
    assert.ok(plan.requirements.some((item) => item.includes("React")));
    assert.ok(plan.atsKeywords.includes("Playwright"));
    assert.match(plan.tailoredResume.markdown, /Senior Frontend Engineer/);
    assert.match(plan.coverLetter.markdown, /accessibility/i);
    assert.equal(plan.proposedActions.some((action) => action.type === "submit_application"), false);
    assert.equal(plan.approvalRequiredBeforeSubmit, true);
  });

  test("phase 6 and 7: browser extension captures page/form context and proposes safe approved actions only", async () => {
    const { createBrowserExtensionContract } = await loadModule(
      "../../workflows/browserExtensionContract.js",
      "Missing browserExtensionContract.js. Expected page capture, form mapping, and approval-safe action proposals.",
    );

    const contract = createBrowserExtensionContract();
    const pageContext = contract.normalizePageCapture({
      url: "https://jobs.example.test/apply",
      title: "Apply - Senior Engineer",
      text: "Name Email Resume Cover letter Submit",
      forms: [
        {
          selector: "form#apply",
          fields: [
            { name: "email", type: "email", value: "secret@example.com" },
            { name: "resume", type: "file" },
          ],
          submitSelector: "button[type=submit]",
        },
      ],
    });

    assert.equal(pageContext.forms[0].fields[0].value, undefined);
    assert.equal(pageContext.forms[0].fields[0].hasSensitiveValue, true);

    const proposal = contract.proposeFormActions({
      pageContext,
      artifactMap: { resume: "artifact-resume-pdf", coverLetter: "artifact-cover-letter-pdf" },
    });

    assert.ok(proposal.actions.some((action) => action.type === "fill_field"));
    assert.ok(proposal.actions.some((action) => action.type === "attach_file"));
    assert.equal(proposal.actions.some((action) => action.type === "submit_form"), false);
    assert.equal(proposal.requiresApprovalForSubmit, true);
  });

  test("phase 8: Firecrawl, MCP, and Playwright adapters sit behind the audited tool registry", async () => {
    const { createExternalAdapterRegistry } = await loadModule(
      "../../workflows/externalAdapterRegistry.js",
      "Missing externalAdapterRegistry.js. Expected Firecrawl, MCP, and Playwright adapters behind Hades tool registry.",
    );

    const adapters = createExternalAdapterRegistry({
      firecrawl: { scrape: async () => ({ markdown: "Job post" }) },
      mcpClients: { supabase: { callTool: async () => ({ ok: true }) } },
      playwrightBridge: { proposeActions: async () => [{ type: "fill_field" }] },
    });

    const toolDefinitions = adapters.listToolDefinitions();
    assert.ok(toolDefinitions.some((tool) => tool.name === "external.firecrawl.scrape"));
    assert.ok(toolDefinitions.some((tool) => tool.name === "external.mcp.supabase.callTool"));
    assert.ok(toolDefinitions.some((tool) => tool.name === "browser.playwright.proposeActions"));
    assert.equal(
      toolDefinitions.find((tool) => tool.name === "browser.playwright.proposeActions").requiresApproval,
      true,
    );
    assert.ok(toolDefinitions.every((tool) => tool.audit === true));
  });

  test("phase 9: workflow audit repository scopes runs, tool calls, approvals, and artifacts by user and tenant", async () => {
    const { createWorkflowAuditRepository } = await loadModule(
      "../../workflows/workflowAuditRepository.js",
      "Missing workflowAuditRepository.js. Expected scoped run logs, tool-call logs, approvals, and artifacts.",
    );

    const repository = createWorkflowAuditRepository();
    await repository.recordToolCall({
      id: "call-a",
      userId: "user-a",
      tenantId: "tenant-a",
      workflowRunId: "run-a",
      toolName: "memory.searchProfileContext",
      status: "completed",
    });
    await repository.recordToolCall({
      id: "call-b",
      userId: "user-b",
      tenantId: "tenant-a",
      workflowRunId: "run-b",
      toolName: "memory.searchProfileContext",
      status: "completed",
    });

    const rows = await repository.listToolCalls({ userId: "user-a", tenantId: "tenant-a" });
    assert.deepEqual(rows.map((row) => row.id), ["call-a"]);
  });
});
