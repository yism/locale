import { parseActionDescriptor } from "../src/core/normalize.mjs";
import { createReferenceAuthority } from "../src/reference-runtime.mjs";
import { preflightLocally, verifyCapabilityToken } from "../src/verifier/index.mjs";

const authority = createReferenceAuthority();

const capability = authority.issueCapability({
  subject: {
    workload_id: "orchestrator.example",
    tenant_id: "tenant_demo",
    mission_id: "mission_docs_preview",
    environment: "prod"
  },
  context: {
    repo_hash: "sha256:demo"
  },
  requested_packs: ["enterprise-strict"]
});

const verified = verifyCapabilityToken(capability.capability_token, authority.getPublishedKeys(), new Date("2026-03-18T18:15:00Z"));
if (verified.status === "error") {
  throw new Error(`Token verification failed: ${verified.code}`);
}

const normalizedRead = parseActionDescriptor({
  protocol: "mcp",
  action_class: "read",
  target: "repo.read_file",
  input_hash: "sha256:demo-read",
  resource_refs: ["path_hash:sha256:read"],
  idempotency_key: "idem-read",
  trace_id: "trace-read"
});
if (normalizedRead.status === "error") {
  throw new Error(`Normalization failed: ${normalizedRead.code}`);
}

const localPreflight = preflightLocally(verified.value.payload, normalizedRead.value, {
  evaluator: authority.evaluator
});

const deployDecision = authority.evaluateAction({
  capabilityToken: capability.capability_token,
  action: {
    protocol: "mcp",
    action_class: "deploy",
    target: "vercel.deploy",
    input_hash: "sha256:demo-deploy",
    resource_refs: ["project_hash:sha256:deploy"],
    idempotency_key: "idem-deploy",
    trace_id: "trace-deploy"
  }
});

console.log(JSON.stringify({
  capability,
  localPreflight,
  deployDecision
}, null, 2));
