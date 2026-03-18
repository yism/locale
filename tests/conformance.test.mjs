import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createAuthority } from "../src/core/authority.mjs";
import { parseActionDescriptor } from "../src/core/normalize.mjs";
import { verifyJws } from "../src/crypto/jws.mjs";
import { createReferenceAuthority, createReferenceKeys } from "../src/reference-runtime.mjs";
import { verifyCapabilityToken, verifyDecisionToken } from "../src/verifier/index.mjs";
import { decodeBase64Url, encodeBase64Url } from "../src/base64url.mjs";
import { loadPackDirectory } from "../src/core/packs.mjs";
import { PROTOCOL_VERSION } from "../src/protocol/constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, "../docs/fixtures");
const authority = createReferenceAuthority();

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(fixtureDir, name), "utf8"));
}

test("createAuthority requires explicit runtime configuration", () => {
  assert.throws(() => createAuthority(), /clock\.now\(\), issuer, signingKey, publishedJwks, packStore, tokenTtlSeconds, protocolVersion/);
});

test("reference runtime exposes deterministic runtime configuration", () => {
  const referenceKeys = createReferenceKeys();
  const runtimeAuthority = createAuthority({
    clock: { now: () => new Date("2026-03-18T18:00:00Z") },
    issuer: "cpa.runtime-test",
    signingKey: referenceKeys.signingKey,
    publishedJwks: referenceKeys.publishedJwks,
    packStore: loadPackDirectory(),
    tokenTtlSeconds: 3600,
    protocolVersion: PROTOCOL_VERSION
  });

  assert.equal(runtimeAuthority.config.issuer, "cpa.runtime-test");
  assert.equal(runtimeAuthority.config.protocolVersion, PROTOCOL_VERSION);
});

test("CT-001 and CT-002 capability issuance includes baseline and bounded time", async () => {
  const request = await readJson("capabilities-get.request.json");
  const response = authority.issueCapability(request);
  const verified = verifyJws(response.capability_token, authority.getPublishedKeys());

  assert.equal(verified.ok, true);
  assert.deepEqual(response.effective_packs, ["baseline", "enterprise-strict"]);
  assert.deepEqual(verified.payload.packs, ["baseline", "enterprise-strict"]);
  assert.ok(verified.payload.exp > verified.payload.iat);
});

test("PE-001 baseline read action is allowed", async () => {
  const capability = authority.issueCapability(await readJson("capabilities-get.request.json"));
  const request = await readJson("policy-evaluate-read-allow.request.json");
  const response = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: request.action
  });

  assert.equal(response.outcome, "allow");
  assert.deepEqual(response.reason_codes, []);
});

test("PE-002 baseline deploy action requires approval", async () => {
  const capability = authority.issueCapability(await readJson("capabilities-get.request.json"));
  const request = await readJson("policy-evaluate-deploy-approval.request.json");
  const response = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: request.action
  });

  assert.equal(response.outcome, "allow_with_approval");
  assert.deepEqual(response.reason_codes, ["policy.approval_required"]);
});

test("PE-003 expired tokens are denied", async () => {
  const capability = authority.issueCapability(await readJson("capabilities-get.request.json"));
  const request = await readJson("policy-evaluate-read-allow.request.json");
  const response = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: request.action,
    now: new Date("2026-03-18T20:00:01Z")
  });

  assert.equal(response.outcome, "deny");
  assert.deepEqual(response.reason_codes, ["token.expired"]);
});

test("PE-004 unknown action classes are denied", () => {
  const result = parseActionDescriptor({
    protocol: "mcp",
    action_class: "quantum",
    target: "future.break_reality",
    input_hash: "sha256:123",
    resource_refs: [],
    idempotency_key: "idem",
    trace_id: "trace"
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "policy.unknown_action");
});

test("KG-001 published keys support offline verification", async () => {
  const capability = authority.issueCapability(await readJson("capabilities-get.request.json"));
  const verified = verifyCapabilityToken(capability.capability_token, authority.getPublishedKeys(), new Date("2026-03-18T18:15:00Z"));

  assert.equal(verified.status, "ok");
  assert.equal(verified.value.payload.kid, "kid_2026_03");
});

test("verification rejects invalid signatures and unknown kids deterministically", async () => {
  const capability = authority.issueCapability(await readJson("capabilities-get.request.json"));
  const [header, payload, signature] = capability.capability_token.split(".");
  const tampered = `${header}.${payload}.${signature.slice(0, -1)}A`;
  const parsedHeader = JSON.parse(decodeBase64Url(header).toString("utf8"));
  parsedHeader.kid = "kid_other";
  const wrongKidToken = `${encodeBase64Url(JSON.stringify(parsedHeader))}.${payload}.${signature}`;

  const invalidSignature = verifyJws(tampered, authority.getPublishedKeys());
  const unknownKid = verifyJws(wrongKidToken, authority.getPublishedKeys());

  assert.equal(invalidSignature.ok, false);
  assert.equal(invalidSignature.error, "token.invalid_signature");
  assert.equal(unknownKid.ok, false);
  assert.equal(unknownKid.error, "token.unknown_kid");
});

test("decision tokens verify offline", async () => {
  const capability = authority.issueCapability(await readJson("capabilities-get.request.json"));
  const request = await readJson("policy-evaluate-read-allow.request.json");
  const response = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: request.action
  });
  const verified = verifyDecisionToken(response.decision_token, authority.getPublishedKeys(), new Date("2026-03-18T18:20:00Z"));

  assert.equal(verified.status, "ok");
  assert.equal(verified.value.payload.outcome, "allow");
});

test("identical normalized evaluations preserve outcome and reason chronology", async () => {
  const capability = authority.issueCapability(await readJson("capabilities-get.request.json"));
  const request = await readJson("policy-evaluate-deploy-approval.request.json");
  const first = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: request.action
  });
  const second = authority.evaluateAction({
    capabilityToken: capability.capability_token,
    action: request.action
  });

  assert.equal(first.outcome, second.outcome);
  assert.deepEqual(first.reason_codes, second.reason_codes);
  assert.deepEqual(first.policy_packs, second.policy_packs);
});
