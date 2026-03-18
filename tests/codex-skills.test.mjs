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

test("locale-integrate skill defines a public integration workflow and guardrails", async () => {
  const skill = await read("codex-skills/locale-integrate/SKILL.md");
  const yaml = await read("codex-skills/locale-integrate/agents/openai.yaml");
  const contract = await read("codex-skills/locale-integrate/references/public-contract.md");

  assert.match(skill, /name: "locale-integrate"/);
  assert.match(skill, /capabilities\.get/);
  assert.match(skill, /policy\.evaluate/);
  assert.match(skill, /keys\.get/);
  assert.match(skill, /offline token verification/);
  assert.match(skill, /execution broker|tool execution/);
  assert.match(yaml, /display_name: "Locale Integrate"/);
  assert.match(yaml, /default_prompt: "Use \$locale-integrate/);
  assert.match(contract, /Locally preflight covered `read` and `network`/i);
});

test("locale-maintain skill encodes repo guardrails and helper-skill boundaries", async () => {
  const skill = await read("codex-skills/locale-maintain/SKILL.md");
  const yaml = await read("codex-skills/locale-maintain/agents/openai.yaml");
  const guardrails = await read("codex-skills/locale-maintain/references/repo-guardrails.md");
  const wiring = await read("codex-skills/locale-maintain/references/automation-wiring.md");

  assert.match(skill, /name: "locale-maintain"/);
  assert.match(skill, /token claims/);
  assert.match(skill, /reason-code semantics/);
  assert.match(skill, /MCP request or response shapes/);
  assert.match(skill, /gh-fix-ci/);
  assert.match(skill, /gh-address-comments/);
  assert.match(yaml, /default_prompt: "Use \$locale-maintain/);
  assert.match(guardrails, /spec docs/);
  assert.match(guardrails, /fixtures/);
  assert.match(wiring, /Do not automate `yeet`, `figma`, `figma-implement-design`, `openai-docs`, or `skill-creator`/);
});

test("canonical automation prompts invoke locale-maintain and supporting skills appropriately", async () => {
  const hardening = await read("codex-automations/hardening-sweep/automation.toml");
  const discoverability = await read("codex-automations/discoverability-sync/automation.toml");
  const threatModel = await read("codex-automations/threat-model-watch/automation.toml");
  const ci = await read("codex-automations/gh-ci-triage/automation.toml");
  const comments = await read("codex-automations/review-comment-hygiene/automation.toml");

  assert.match(hardening, /\[\$locale-maintain\]\(\/Users\/mchap\/Projects\/Locale\/codex-skills\/locale-maintain\/SKILL\.md\)/);
  assert.match(discoverability, /Discoverability Sync/);
  assert.match(threatModel, /This is a report-first loop/);
  assert.match(ci, /\[\$gh-fix-ci\]\(\/Users\/mchap\/\.codex\/skills\/gh-fix-ci\/SKILL\.md\)/);
  assert.match(comments, /\[\$gh-address-comments\]\(\/Users\/mchap\/\.codex\/skills\/gh-address-comments\/SKILL\.md\)/);
});

test("codex sync docs and script are wired into the repo", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const doc = await read("docs/codex-skills.md");
  const readme = await read("README.md");
  const docsIndex = await read("docs/index.md");
  const syncScript = await read("scripts/sync-codex-assets.mjs");

  assert.equal(packageJson.scripts["codex:sync"], "node scripts/sync-codex-assets.mjs");
  assert.match(doc, /codex-skills\/locale-integrate/);
  assert.match(doc, /codex-automations/);
  assert.match(doc, /node scripts\/sync-codex-assets\.mjs/);
  assert.match(readme, /\[docs\/codex-skills\.md\]/);
  assert.match(docsIndex, /\[Codex Skills\]\(\.\/codex-skills\.md\)/);
  assert.match(syncScript, /codex-skills/);
  assert.match(syncScript, /codex-automations/);
});
