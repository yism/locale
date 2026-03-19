import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createReferenceKeys } from "../src/reference-runtime.mjs";
import { createEnterpriseAuthorityFromEnv, startEnterpriseHttpService } from "../examples/enterprise-http-service.mjs";

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("enterprise example builds a runtime authority from explicit env config", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpa-enterprise-env-"));
  const signingKeyPath = path.join(tempDir, "signing-key.json");
  const referenceKeys = createReferenceKeys();
  await writeJson(signingKeyPath, referenceKeys.signingKey);

  const authority = createEnterpriseAuthorityFromEnv({
    CPA_ISSUER: "cpa.enterprise.test",
    CPA_SIGNING_KEY_PATH: signingKeyPath,
    CPA_TOKEN_TTL_SECONDS: "1800"
  });

  assert.equal(authority.config.mode, "runtime");
  assert.equal(authority.config.issuer, "cpa.enterprise.test");
  assert.equal(authority.config.tokenTtlSeconds, 1800);

  const capability = authority.issueCapability({
    subject: {
      workload_id: "orchestrator.enterprise",
      tenant_id: "tenant_demo",
      mission_id: "mission_enterprise",
      environment: "prod"
    },
    context: {},
    requested_packs: ["enterprise-strict"]
  });

  assert.equal(capability.authority_mode, "runtime");
});

test("enterprise example exposes the embedded HTTP handler for health checks", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cpa-enterprise-http-"));
  const signingKeyPath = path.join(tempDir, "signing-key.json");
  const referenceKeys = createReferenceKeys();
  await writeJson(signingKeyPath, referenceKeys.signingKey);

  const service = startEnterpriseHttpService({
    env: {
      CPA_ISSUER: "cpa.enterprise.test",
      CPA_SIGNING_KEY_PATH: signingKeyPath,
      CPA_PORT: "8080"
    }
  });

  const health = await service.handleRequest({
    method: "GET",
    url: "/health",
    body: ""
  });

  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { ok: true });
});
