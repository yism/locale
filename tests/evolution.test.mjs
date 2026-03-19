import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createAuthority } from "../src/core/authority.mjs";
import { createEvidenceLedger } from "../src/core/evidence-ledger.mjs";
import { createFilePolicyStore } from "../src/core/file-policy-store.mjs";
import { loadPackDirectory, resolvePackSelection, resolvePolicyOutcome } from "../src/core/packs.mjs";
import { parseActionDescriptor } from "../src/core/normalize.mjs";
import { createReferenceAuthority, createReferenceKeys } from "../src/reference-runtime.mjs";
import { PROTOCOL_VERSION } from "../src/protocol/constants.mjs";
import { verifyCapabilityToken } from "../src/verifier/index.mjs";

function createRuntimeAuthority(overrides = {}) {
  const referenceKeys = createReferenceKeys();
  return createAuthority({
    clock: overrides.clock || { now: () => new Date("2026-03-18T18:00:00Z") },
    issuer: overrides.issuer || "cpa.runtime-test",
    signingKey: overrides.signingKey || referenceKeys.signingKey,
    publishedJwks: overrides.publishedJwks || referenceKeys.publishedJwks,
    packStore: overrides.packStore || loadPackDirectory(),
    tokenTtlSeconds: overrides.tokenTtlSeconds || 3600,
    protocolVersion: overrides.protocolVersion || PROTOCOL_VERSION,
    ...(overrides.policyStore ? { policyStore: overrides.policyStore } : {}),
    ...(overrides.evidenceLedger ? { evidenceLedger: overrides.evidenceLedger } : {}),
    ...(overrides.federationProfile ? { federationProfile: overrides.federationProfile } : {})
  });
}

function issueCapability(authority, requestedPacks = ["enterprise-strict"]) {
  return authority.issueCapability({
    subject: {
      workload_id: "orchestrator.example",
      tenant_id: "tenant_demo",
      mission_id: "mission_evolution",
      environment: "prod"
    },
    context: {
      repo_hash: "sha256:demo"
    },
    requested_packs: requestedPacks
  });
}

test("scope overrides enforce exact rule provenance and emit scope suggestions", () => {
  const packStore = loadPackDirectory();
  const selection = resolvePackSelection(packStore, ["enterprise-strict"]);
  const parsed = parseActionDescriptor({
    protocol: "mcp",
    action_class: "read",
    target: "repo.read_file",
    input_hash: "sha256:scope",
    resource_refs: ["path:/etc/config"],
    idempotency_key: "idem-scope",
    trace_id: "trace-scope"
  });

  assert.equal(parsed.status, "ok");
  const policy = resolvePolicyOutcome({
    packs: selection.packs,
    actionClass: parsed.value.action_class,
    environment: "prod",
    normalizedAction: parsed.value
  });

  assert.equal(policy.outcome, "deny");
  assert.equal(policy.winningSource, "scope_override");
  assert.equal(policy.winningRule.resource, "path:/etc/*");

  const authority = createReferenceAuthority();
  const capability = issueCapability(authority);
  const response = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: parsed.value
  });

  assert.equal(response.outcome, "deny");
  assert.equal(response.policy_suggestion.kind, "scope_grant");
  assert.equal(
    response.policy_suggestion.minimal_delta.session_patch.packs[0].scope_overrides[0].resource,
    "path:/etc/config"
  );
});

test("host scope suggestions work and hashed-only actions do not emit scope grants", () => {
  const authority = createReferenceAuthority();
  const capability = issueCapability(authority);

  const networkResponse = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: {
      protocol: "mcp",
      action_class: "network",
      target: "http.fetch",
      input_hash: "sha256:network",
      resource_refs: ["host:internal.api.local"],
      idempotency_key: "idem-network",
      trace_id: "trace-network"
    }
  });
  assert.equal(networkResponse.outcome, "deny");
  assert.equal(networkResponse.policy_suggestion.kind, "scope_grant");

  const approvalResponse = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: {
      protocol: "mcp",
      action_class: "deploy",
      target: "vercel.deploy",
      input_hash: "sha256:deploy",
      resource_refs: ["project_hash:sha256:deploy"],
      idempotency_key: "idem-deploy",
      trace_id: "trace-deploy"
    }
  });
  assert.equal(approvalResponse.outcome, "allow_with_approval");
  assert.equal(approvalResponse.policy_suggestion.kind, "approval_grant");
});

test("budget exhaustion emits a budget adjustment suggestion", () => {
  const authority = createReferenceAuthority();
  const capability = authority.issueCapability({
    subject: {
      workload_id: "orchestrator.example",
      tenant_id: "tenant_demo",
      mission_id: "mission_budget",
      environment: "prod"
    },
    context: {},
    requested_packs: []
  });
  const verified = verifyCapabilityToken(capability.capability_token, authority.getPublishedKeys(), new Date("2026-03-18T18:15:00Z"));
  assert.equal(verified.status, "ok");

  const parsed = parseActionDescriptor({
    protocol: "mcp",
    action_class: "read",
    target: "repo.read_file",
    input_hash: "sha256:budget",
    resource_refs: [],
    idempotency_key: "idem-budget",
    trace_id: "trace-budget"
  });
  assert.equal(parsed.status, "ok");

  const result = authority.evaluator.evaluateTokenAction({
    tokenPayload: {
      ...verified.value.payload,
      bud: {
        ...verified.value.payload.bud,
        read_per_minute: 0
      }
    },
    normalizedAction: parsed.value
  });

  assert.equal(result.outcome, "deny");
  assert.equal(result.reason_codes[0], "token.budget_exhausted");
  assert.equal(result.policy_suggestion.kind, "budget_adjustment");
});

test("policy.evolve applies session approvals and durable approvals", async () => {
  const authority = createReferenceAuthority();
  const capability = issueCapability(authority, []);
  const action = {
    protocol: "mcp",
    action_class: "deploy",
    target: "vercel.deploy",
    input_hash: "sha256:deploy",
    resource_refs: ["project_hash:sha256:deploy"],
    idempotency_key: "idem-deploy",
    trace_id: "trace-deploy"
  };

  const first = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action
  });
  assert.equal(first.outcome, "allow_with_approval");
  const evolved = authority.evolvePolicy({
    suggestionId: first.policy_suggestion.suggestion_id,
    decision: "approve",
    persist: "session"
  });
  assert.equal(evolved.status, "ok");

  const second = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action
  });
  assert.equal(second.outcome, "allow");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpa-policy-store-"));
  const policyStore = createFilePolicyStore({
    filePath: path.join(tempDir, "policy-overrides.json")
  });
  const runtimeAuthority = createRuntimeAuthority({ policyStore });
  const runtimeCapability = issueCapability(runtimeAuthority, []);
  const runtimeFirst = runtimeAuthority.evaluateAction({
    capabilityToken: runtimeCapability.capability_token,
    action
  });
  assert.equal(runtimeFirst.outcome, "allow_with_approval");
  const persisted = runtimeAuthority.evolvePolicy({
    suggestionId: runtimeFirst.policy_suggestion.suggestion_id,
    decision: "approve",
    persist: "policy_store"
  });
  assert.equal(persisted.status, "ok");

  const runtimeCapabilityAfter = issueCapability(runtimeAuthority, []);
  const runtimeSecond = runtimeAuthority.evaluateAction({
    capabilityToken: runtimeCapabilityAfter.capability_token,
    action
  });
  assert.equal(runtimeSecond.outcome, "allow");
});

test("federation metadata is additive when enabled", () => {
  const authority = createRuntimeAuthority({
    federationProfile: {
      issuerDid: "did:example:cpa-runtime",
      didDocument: {
        id: "did:example:cpa-runtime",
        verificationMethod: ["did:example:cpa-runtime#keys-1"]
      },
      agentCard: {
        id: "did:example:cpa-runtime#agent-card",
        trust_score: 88,
        sla_constraints: {
          max_actions: 25
        }
      }
    }
  });
  const capability = issueCapability(authority, []);
  assert.ok(capability.federation_attestations.vc_jwt);
  assert.equal(capability.federation_attestations.agent_card.id, "did:example:cpa-runtime#agent-card");

  const keys = authority.getPublishedKeys();
  assert.equal(keys.federation.issuer_did, "did:example:cpa-runtime");
  assert.deepEqual(keys.federation.supported_attestation_formats, ["jws", "vc+jwt"]);
});

test("evidence ledger verifies hash chains and synthesizes rollback plans", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpa-ledger-"));
  const ledgerPath = path.join(tempDir, "ledger.jsonl");
  const ledger = createEvidenceLedger({
    filePath: ledgerPath,
    clock: { now: () => new Date("2026-03-18T18:00:00Z") }
  });
  const authority = createRuntimeAuthority({ evidenceLedger: ledger });
  const capability = issueCapability(authority, []);
  const action = {
    protocol: "mcp",
    action_class: "read",
    target: "repo.read_file",
    input_hash: "sha256:ledger",
    resource_refs: ["path:/workspace/README.md"],
    idempotency_key: "idem-ledger",
    trace_id: "trace-ledger"
  };
  const evaluation = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action
  });
  assert.equal(evaluation.outcome, "allow");

  authority.recordResult({
    sessionId: "mission_evolution",
    traceId: "trace-ledger",
    result: { status: "completed" },
    artifacts: [{ path: "/workspace/README.md", checksum: "sha256:abc" }],
    compensationPlan: ["Restore README from checksum sha256:abc if downstream processing fails."]
  });

  const integrity = ledger.verifyIntegrity();
  assert.equal(integrity.ok, true);

  const rollbackPlan = authority.buildRollbackPlan({
    sessionId: "mission_evolution",
    traceId: "trace-ledger"
  });
  assert.equal(rollbackPlan.instructions.length, 1);
  assert.equal(rollbackPlan.artifacts.length, 1);

  const lines = (await fs.readFile(ledgerPath, "utf8")).trim().split("\n");
  const tampered = JSON.parse(lines[0]);
  tampered.verdict.outcome = "deny";
  lines[0] = JSON.stringify(tampered);
  await fs.writeFile(ledgerPath, `${lines.join("\n")}\n`);

  const broken = ledger.verifyIntegrity();
  assert.equal(broken.ok, false);
});
