import assert from "node:assert/strict";
import test from "node:test";
import { createEvaluator } from "../src/core/evaluator.mjs";
import { loadPackDirectory, resolvePackSelection } from "../src/core/packs.mjs";
import { parseActionDescriptor } from "../src/core/normalize.mjs";
import { createReferenceAuthority } from "../src/reference-runtime.mjs";
import { verifyCapabilityToken, preflightLocally } from "../src/verifier/index.mjs";

test("baseline is always present and unknown packs become warnings", () => {
  const packStore = loadPackDirectory();
  const selection = resolvePackSelection(packStore, ["enterprise-strict", "missing-pack"]);

  assert.deepEqual(selection.ids, ["baseline", "enterprise-strict"]);
  assert.deepEqual(selection.warnings, ["unknown_pack:missing-pack"]);
});

test("stricter overlays win in prod", () => {
  const authority = createReferenceAuthority();
  const capability = authority.issueCapability({
    subject: {
      workload_id: "orchestrator.example",
      tenant_id: "tenant_demo",
      mission_id: "mission_strict_prod",
      environment: "prod"
    },
    context: {},
    requested_packs: ["enterprise-strict"]
  });

  const response = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: {
      protocol: "mcp",
      action_class: "write",
      target: "repo.write_file",
      input_hash: "sha256:write",
      resource_refs: [],
      idempotency_key: "idem-write",
      trace_id: "trace-write"
    }
  });

  assert.equal(response.outcome, "deny");
  assert.deepEqual(response.reason_codes, ["policy.pack_denied"]);
});

test("local preflight allows covered reads and flags approval-gated actions", () => {
  const authority = createReferenceAuthority();
  const capability = authority.issueCapability({
    subject: {
      workload_id: "orchestrator.example",
      tenant_id: "tenant_demo",
      mission_id: "mission_local",
      environment: "prod"
    },
    context: {},
    requested_packs: []
  });
  const verified = verifyCapabilityToken(capability.capability_token, authority.getPublishedKeys(), new Date("2026-03-18T18:15:00Z"));
  const evaluator = createEvaluator({ packStore: authority.evaluator.packStore });

  const readAction = parseActionDescriptor({
    protocol: "mcp",
    action_class: "read",
    target: "repo.read_file",
    input_hash: "sha256:read",
    resource_refs: [],
    idempotency_key: "idem-read",
    trace_id: "trace-read"
  });
  const deployAction = parseActionDescriptor({
    protocol: "mcp",
    action_class: "deploy",
    target: "vercel.deploy",
    input_hash: "sha256:deploy",
    resource_refs: [],
    idempotency_key: "idem-deploy",
    trace_id: "trace-deploy"
  });

  assert.equal(verified.status, "ok");
  assert.equal(readAction.status, "ok");
  assert.equal(deployAction.status, "ok");
  assert.deepEqual(preflightLocally(verified.value.payload, readAction.value, { evaluator }), {
    outcome: "allow",
    should_call_remote: false,
    reason_codes: [],
    budget_effects: {
      rate_bucket: "read_per_minute",
      units_consumed: 1,
      remaining_estimate: 199
    }
  });
  assert.equal(preflightLocally(verified.value.payload, deployAction.value, { evaluator }).should_call_remote, true);
});
