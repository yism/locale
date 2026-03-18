#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = { localeRoot: process.cwd(), runTests: false, json: false };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--locale-root" && argv[i + 1]) {
      args.localeRoot = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (value === "--run-tests") {
      args.runTests = true;
      continue;
    }
    if (value === "--json") {
      args.json = true;
      continue;
    }
  }

  return args;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function runNodeTest(localeRoot) {
  return new Promise((resolve) => {
    const child = spawn("node", ["--test", "tests/compatibility.test.mjs"], {
      cwd: localeRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

const REQUIRED_PATHS = [
  "docs/transcripts/capabilities.get.json",
  "docs/transcripts/policy.evaluate.json",
  "docs/transcripts/keys.get.json",
  "docs/host-profiles/codex-mcp.json",
  "docs/fixtures/capabilities-get.response.json",
  "docs/verification-workflow.md",
  "docs/chronology/LATEST"
];

const args = parseArgs(process.argv.slice(2));
const checks = [];

for (const relativePath of REQUIRED_PATHS) {
  const target = path.join(args.localeRoot, relativePath);
  checks.push({
    path: relativePath,
    ok: await exists(target)
  });
}

let testResult = null;
if (args.runTests) {
  testResult = await runNodeTest(args.localeRoot);
}

const ok = checks.every((entry) => entry.ok) && (!testResult || testResult.ok);
const summary = {
  localeRoot: args.localeRoot,
  ok,
  checks,
  ...(testResult ? { compatibilityTest: testResult } : {})
};

if (args.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Locale root: ${summary.localeRoot}`);
  for (const check of summary.checks) {
    console.log(`${check.ok ? "OK" : "MISSING"} ${check.path}`);
  }
  if (summary.compatibilityTest) {
    console.log(`compatibility.test.mjs: ${summary.compatibilityTest.ok ? "OK" : `FAILED (${summary.compatibilityTest.code})`}`);
  }
}

process.exitCode = summary.ok ? 0 : 1;
