import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadWorkflowContract() {
  try {
    return await import("../../workflows/workflowDefinition.contract.js");
  } catch (error) {
    throw new Error(
      "Missing workflowDefinition.contract.js. Expected a backend-owned workflow/minion goal schema with explanation, tools, approvals, and frontend-safe JSON.",
      { cause: error }
    );
  }
}

async function loadWorkflowRepository() {
  try {
    return await import("../../workflows/workflowRepository.js");
  } catch (error) {
    throw new Error(
      "Missing workflowRepository.js. Expected scoped persistence for workflow definitions, runs, tool calls, approvals, artifacts, and creation logs.",
      { cause: error }
    );
  }
}

async function loadWorkflowOrchestrator() {
  try {
    return await import("../../workflows/workflowOrchestrator.js");
  } catch (error) {
    throw new Error(
      "Missing workflowOrchestrator.js. Expected Hermes planning plus Hades-owned tool validation, approval gates, and audited execution.",
      { cause: error }
    );
  }
}

async function loadExtensionKeyRepository() {
  try {
    return await import("../../workflows/extensionKeyRepository.js");
  } catch (error) {
    throw new Error(
      "Missing extensionKeyRepository.js. Expected named, scoped, rotatable, revocable extension API keys with secret redaction.",
      { cause: error }
    );
  }
}

describe("Hermes workflow orchestrator TDD contract", () => {
  test("workflow definition schema supports dynamic task-focused minions and explanation payloads", async () => {
    const { validateWorkflowDefinition } = await loadWorkflowContract();

    const result = validateWorkflowDefinition({
      name: "Targeted Job Application",
      goal: "Apply to a specific job with tailored resume and cover letter after approval.",
      prompt: "Use my saved profile context and the current job requirements.",
      guardrails: [
        "Do not submit without explicit approval.",
        "Do not invent resume facts.",
      ],
      allowedTools: ["profile.read", "job.extract", "resume.tailor", "browser.fill_form"],
      approvalPolicy: {
        requireApprovalFor: ["browser.submit", "email.send", "calendar.write"],
      },
      requiredContext: ["resume_profile", "job_posting"],
      explanation: {
        shortDescription: "Tailors a resume and cover letter for one job application.",
        markdownTable:
          "| Field | Value |\n| --- | --- |\n| Approval | Required before submit |",
        mermaidDiagram:
          "flowchart TD\n  A[Read job] --> B[Match resume]\n  B --> C[Draft materials]\n  C --> D{Approve submit?}",
        guardrailSummary: "Draft and fill are allowed; submit requires approval.",
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.value.kind, "workflow");
    assert.equal(result.value.explanation.mermaidDirection, "TD");
  });

  test("workflow repository scopes definitions, runs, logs, and artifacts by userId and tenantId", async () => {
    const { createWorkflowRepository } = await loadWorkflowRepository();
    const repo = createWorkflowRepository({ storage: "memory" });

    await repo.createDefinition({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "wf_a", name: "A workflow", goal: "A private goal" },
    });
    await repo.createDefinition({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "wf_b", name: "B workflow", goal: "B private goal" },
    });

    const workflows = await repo.listDefinitions({ userId: "user_a", tenantId: "tenant_a" });

    assert.deepEqual(workflows.map((workflow) => workflow.id), ["wf_a"]);
    assert.equal(JSON.stringify(workflows).includes("B private goal"), false);
  });

  test("orchestrator pauses high-impact tool actions for approval and writes an audit entry", async () => {
    const { createWorkflowOrchestrator } = await loadWorkflowOrchestrator();
    const audit = [];
    const approvals = [];

    const orchestrator = createWorkflowOrchestrator({
      hermesPlanner: {
        async plan() {
          return {
            toolCalls: [
              {
                id: "call_submit",
                toolName: "browser.submit",
                input: { selector: "button[type=submit]" },
              },
            ],
          };
        },
      },
      toolRegistry: {
        get(toolName) {
          return {
            name: toolName,
            risk: "high",
            requiresApproval: true,
            execute: async () => ({ ok: true }),
          };
        },
      },
      approvalRepository: {
        create: async (request) => {
          approvals.push(request);
          return { id: "approval_1", ...request };
        },
      },
      auditRepository: {
        create: async (entry) => {
          audit.push(entry);
          return entry;
        },
      },
    });

    const result = await orchestrator.run({
      authContext: { userId: "user_a", tenantId: "tenant_a" },
      workflow: { id: "wf_apply", allowedTools: ["browser.submit"] },
      input: { message: "submit when ready" },
    });

    assert.equal(result.status, "approval_required");
    assert.equal(approvals.length, 1);
    assert.equal(audit.length, 1);
    assert.equal(audit[0].status, "paused_for_approval");
  });

  test("extension API keys are scoped, rotatable, revocable, and secret-safe", async () => {
    const { createExtensionKeyRepository } = await loadExtensionKeyRepository();
    const repo = createExtensionKeyRepository({ storage: "memory" });

    const created = await repo.createKey({
      userId: "user_a",
      tenantId: "tenant_a",
      data: {
        name: "Chrome extension",
        scopes: ["extension.chat", "extension.upload", "workflow.run"],
      },
    });

    assert.equal(typeof created.plaintextKey, "string");
    assert.equal(created.record.user_id, "user_a");
    assert.equal(created.record.tenant_id, "tenant_a");
    assert.equal(JSON.stringify(created.record).includes(created.plaintextKey), false);
    assert.equal(typeof created.record.key_hash, "string");
    assert.notEqual(created.record.key_hash, created.plaintextKey);
    assert.equal(Object.hasOwn(created.record, "encrypted_key"), false);
    assert.equal(Object.hasOwn(created.record, "plaintextKey"), false);

    const listed = await repo.listKeys({ userId: "user_a", tenantId: "tenant_a" });
    assert.equal(JSON.stringify(listed).includes(created.plaintextKey), false);
    assert.equal(typeof listed[0].key_hash, "string");

    const rotated = await repo.rotateKey({
      id: created.record.id,
      userId: "user_a",
      tenantId: "tenant_a",
    });
    assert.notEqual(rotated.plaintextKey, created.plaintextKey);
    assert.equal(JSON.stringify(rotated.record).includes(rotated.plaintextKey), false);

    await repo.revokeKey({
      id: created.record.id,
      userId: "user_a",
      tenantId: "tenant_a",
    });

    const verified = await repo.verifyKey({
      plaintextKey: rotated.plaintextKey,
      requiredScope: "workflow.run",
    });
    assert.equal(verified, null);
  });
});
