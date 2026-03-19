import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function read(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), "utf8");
}

test("package metadata exposes a public CLI entrypoint", async () => {
  const packageJson = JSON.parse(await read("package.json"));

  assert.equal(packageJson.name, "capability-policy-authority");
  assert.equal(packageJson.license, "Apache-2.0");
  assert.equal(packageJson.bin["capability-policy-authority"], "./src/cli.mjs");
  assert.ok(packageJson.keywords.includes("mcp"));
  assert.ok(packageJson.keywords.includes("capability"));
  assert.ok(packageJson.keywords.includes("agent-policy"));
});

test("README exposes the canonical one-line commands", async () => {
  const readme = await read("README.md");

  assert.match(readme, /npx capability-policy-authority serve-stdio/);
  assert.match(readme, /npx capability-policy-authority serve-http 8080/);
  assert.match(readme, /Agent policy layer for safe tool use/);
  assert.match(readme, /Locale is the project brand/);
  assert.match(readme, /\[docs\/architecture\.md\]/);
  assert.match(readme, /\[docs\/index\.md\]/);
});

test("deployment docs include Docker and health check guidance", async () => {
  const deployDoc = await read("docs/deploy-cloud.md");
  const dockerfile = await read("Dockerfile");

  assert.match(deployDoc, /docker build -t capability-policy-authority/);
  assert.match(deployDoc, /GET \/health/);
  assert.match(dockerfile, /serve-http", "8080/);
});

test("docs set includes quickstart, integration, and changelog", async () => {
  const quickstart = await read("docs/quickstart-local.md");
  const integration = await read("docs/integration-patterns.md");
  const changelog = await read("docs/changelog.md");
  const migration = await read("docs/migration-v0.3.md");
  const enterprise = await read("docs/enterprise-online.md");
  const adoption = await read("docs/adoption-checklist.md");

  assert.match(quickstart, /npx capability-policy-authority serve-stdio/);
  assert.match(integration, /capabilities.get/);
  assert.match(changelog, /# Changelog/);
  assert.match(migration, /createReferenceAuthority/);
  assert.match(enterprise, /embedded backend component/);
  assert.match(enterprise, /examples\/enterprise-http-service\.mjs/);
  assert.match(adoption, /exactly four MCP tools/);
});

test("docs index links the primary adoption documents", async () => {
  const index = await read("docs/index.md");

  assert.match(index, /\[Architecture\]\(\.\/architecture\.md\)/);
  assert.match(index, /\[Capability Authority v0\.3\]\(\.\/capability-authority-v0\.3\.md\)/);
  assert.match(index, /\[Migration v0\.3\]\(\.\/migration-v0\.3\.md\)/);
  assert.match(index, /\[Local Quickstart\]\(\.\/quickstart-local\.md\)/);
  assert.match(index, /\[Cloud Deployment\]\(\.\/deploy-cloud\.md\)/);
  assert.match(index, /\[Enterprise Online Deployment\]\(\.\/enterprise-online\.md\)/);
  assert.match(index, /\[Integration Patterns\]\(\.\/integration-patterns\.md\)/);
  assert.match(index, /\[Verification Workflow\]\(\.\/verification-workflow\.md\)/);
  assert.match(index, /\[Changelog\]\(\.\/changelog\.md\)/);
});

test("architecture explainer references only the current MCP tools and hardening truth sources", async () => {
  const architecture = await read("docs/architecture.md");

  assert.match(architecture, /`capabilities\.get`/);
  assert.match(architecture, /`policy\.evaluate`/);
  assert.match(architecture, /`policy\.evolve`/);
  assert.match(architecture, /`keys\.get`/);
  assert.doesNotMatch(architecture, /`resources\/list`/);
  assert.match(architecture, /docs\/transcripts/);
  assert.match(architecture, /docs\/host-profiles/);
  assert.match(architecture, /docs\/chronology/);
  assert.match(architecture, /docs\/verification-workflow\.md/);
});

test("discoverability pages stay within the supported product boundary", async () => {
  const useCases = await read("docs/use-cases-mcp-builders.md");
  const compare = await read("docs/compare-and-decide.md");
  const fastPath = await read("docs/integration-fast-path.md");
  const migration = await read("docs/migration-v0.3.md");
  const deploy = await read("docs/deploy-cloud.md");

  assert.match(useCases, /IDE preflight gate/);
  assert.match(useCases, /Orchestrator boundary layer/);
  assert.match(useCases, /Enterprise policy shim/);
  assert.match(useCases, /Compatibility oracle/);
  assert.match(compare, /evaluate-only agent preflight/);
  assert.match(compare, /Do not use this when you need/);
  assert.match(compare, /secret brokerage/);
  assert.match(compare, /workflow orchestration/);
  assert.match(compare, /payment handling/);
  assert.match(fastPath, /serve-stdio/);
  assert.match(fastPath, /serve-http 8080/);
  assert.match(fastPath, /reference runtime/);
  assert.match(fastPath, /Host Profiles/);
  assert.match(migration, /createAuthority\(config\)/);
  assert.match(deploy, /production-oriented bootstrap example/);
});

test("contribution templates enforce chronology-first intake", async () => {
  const contributing = await read("CONTRIBUTING.md");
  const prTemplate = await read(".github/pull_request_template.md");
  const hostTemplate = await read(".github/ISSUE_TEMPLATE/host-compatibility-regression.md");
  const chronologyTemplate = await read(".github/ISSUE_TEMPLATE/chronology-mismatch.md");
  const docsTemplate = await read(".github/ISSUE_TEMPLATE/docs-changelog-mismatch.md");
  const transcriptTemplate = await read(".github/ISSUE_TEMPLATE/transcript-drift.md");
  const signalTemplate = await read(".github/ISSUE_TEMPLATE/research-pressure-signal.md");

  assert.match(contributing, /chronology-first/);
  assert.match(contributing, /npm run fixtures:refresh/);
  assert.match(prTemplate, /Contract impact classification/);
  assert.match(prTemplate, /Chronology impact/);
  assert.match(prTemplate, /npm test/);
  assert.match(hostTemplate, /Contract impact classification/);
  assert.match(chronologyTemplate, /Affected truth artifacts/);
  assert.match(docsTemplate, /Affected public docs/);
  assert.match(transcriptTemplate, /Expected transcript or response/);
  assert.match(signalTemplate, /Signal type/);
});

test("public launch files are present for open-source intake", async () => {
  const license = await read("LICENSE");
  const notice = await read("NOTICE");
  const conduct = await read("CODE_OF_CONDUCT.md");
  const security = await read("SECURITY.md");
  const support = await read("SUPPORT.md");
  const funding = await read(".github/FUNDING.yml");
  const issueConfig = await read(".github/ISSUE_TEMPLATE/config.yml");

  assert.match(license, /Apache License/);
  assert.match(notice, /Locale contributors/);
  assert.match(conduct, /Contributor Covenant/);
  assert.match(security, /Security Policy/);
  assert.match(support, /GitHub Discussions/);
  assert.match(funding, /github:/);
  assert.match(issueConfig, /contact_links:/);
});

test("changelog references the current chronology version", async () => {
  const changelog = await read("docs/changelog.md");
  const latest = (await read("docs/chronology/LATEST")).trim();
  const escapedLatest = latest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert.match(changelog, new RegExp(`## ${escapedLatest}`));
  assert.match(changelog, new RegExp(`docs/chronology/${escapedLatest}/manifest\\.json`));
  assert.match(changelog, /### Release summary/);
});
