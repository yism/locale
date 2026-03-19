import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROTOCOL_VERSION } from "../src/protocol/constants.mjs";
import { createReferenceAuthority } from "../src/reference-runtime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "..");
export const chronologyRoot = path.join(repoRoot, "docs/chronology");

const trackedRelativePaths = [
  ".github/ISSUE_TEMPLATE/chronology-mismatch.md",
  ".github/ISSUE_TEMPLATE/docs-changelog-mismatch.md",
  ".github/ISSUE_TEMPLATE/host-compatibility-regression.md",
  ".github/ISSUE_TEMPLATE/research-pressure-signal.md",
  ".github/ISSUE_TEMPLATE/transcript-drift.md",
  ".github/pull_request_template.md",
  "CONTRIBUTING.md",
  "docs/capability-authority-v0.3.md",
  "docs/conformance-spec-v0.1.md",
  "docs/adoption-checklist.md",
  "docs/architecture.md",
  "docs/architecture.mmd",
  "docs/change-pipeline.md",
  "docs/compare-and-decide.md",
  "docs/host-profiles/codex-mcp.json",
  "docs/index.md",
  "docs/integration-fast-path.md",
  "docs/integration-patterns.md",
  "docs/migration-v0.3.md",
  "docs/protocol-foundations.md",
  "docs/quickstart-local.md",
  "docs/deploy-cloud.md",
  "docs/use-cases-mcp-builders.md",
  "docs/verification-workflow.md",
  "docs/fixtures/capabilities-get.request.json",
  "docs/fixtures/capabilities-get.response.json",
  "docs/fixtures/keys-get.response.json",
  "docs/fixtures/policy-evaluate-scope-deny.request.json",
  "docs/fixtures/policy-evaluate-scope-deny.response.json",
  "docs/fixtures/policy-evolve-approve.request.json",
  "docs/fixtures/policy-evolve-approve.response.json",
  "docs/fixtures/policy-evaluate-deploy-approval.request.json",
  "docs/fixtures/policy-evaluate-deploy-approval.response.json",
  "docs/fixtures/policy-evaluate-expired-token.response.json",
  "docs/fixtures/policy-evaluate-read-allow.request.json",
  "docs/fixtures/policy-evaluate-read-allow.response.json",
  "docs/transcripts/capabilities.get.json",
  "docs/transcripts/keys.get.json",
  "docs/transcripts/policy.evolve.json",
  "docs/transcripts/policy.evaluate.json",
  "packs/baseline.json",
  "packs/ci-noninteractive.json",
  "packs/commerce-guarded.json",
  "packs/enterprise-strict.json",
  "packs/regulated-data.json"
];

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function buildChronologyManifest() {
  const authority = createReferenceAuthority();
  const files = [];

  for (const relativePath of trackedRelativePaths) {
    const absolutePath = path.join(repoRoot, relativePath);
    const contents = await fs.readFile(absolutePath);
    files.push({
      path: relativePath,
      sha256: sha256(contents)
    });
  }

  files.sort((left, right) => left.path.localeCompare(right.path));

  return {
    chronology_version: 1,
    protocol_version: PROTOCOL_VERSION,
    authority_surface: {
      mcp_tools: ["capabilities.get", "policy.evaluate", "policy.evolve", "keys.get"],
      token_format: authority.getPublishedKeys().supported_token_formats,
      policy_packs: authority.getPublishedKeys().policy_packs
    },
    files
  };
}

export async function writeChronologyManifest() {
  const manifest = await buildChronologyManifest();
  const versionDir = path.join(chronologyRoot, manifest.protocol_version);
  await fs.mkdir(versionDir, { recursive: true });
  await fs.writeFile(path.join(versionDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(chronologyRoot, "LATEST"), `${manifest.protocol_version}\n`);
  return manifest;
}
