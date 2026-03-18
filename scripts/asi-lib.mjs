import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEvaluator } from "../src/core/evaluator.mjs";
import { createReferenceAuthority } from "../src/reference-runtime.mjs";
import { parseActionDescriptor } from "../src/core/normalize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export function repoPath(...parts) {
  return path.resolve(repoRoot, ...parts);
}

export async function readJson(absolutePath) {
  return JSON.parse(await fs.readFile(absolutePath, "utf8"));
}

export async function writeJson(absolutePath, value) {
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function createRng(seed = 1) {
  let state = (seed >>> 0) || 1;
  return {
    nextU32() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state;
    },
    nextFloat() {
      return this.nextU32() / 0xffffffff;
    },
    pick(list) {
      return list[Math.floor(this.nextFloat() * list.length)];
    },
    bool(p = 0.5) {
      return this.nextFloat() < p;
    },
    int(min, maxInclusive) {
      const span = maxInclusive - min + 1;
      return min + (this.nextU32() % span);
    }
  };
}

export function nowNs() {
  return process.hrtime.bigint();
}

export function nsToMs(ns) {
  return Number(ns) / 1e6;
}

export function percentile(sortedNumbers, p) {
  if (sortedNumbers.length === 0) return null;
  const idx = Math.min(sortedNumbers.length - 1, Math.max(0, Math.floor((p / 100) * sortedNumbers.length)));
  return sortedNumbers[idx];
}

export function buildActionCorpus({ seed = 1 } = {}) {
  const rng = createRng(seed);
  const protocols = ["mcp", "http", "stdio"];
  const actionClasses = ["read", "network", "deploy", "commerce", "write", "identity", "secrets", "admin"];
  const targetsByClass = {
    read: ["repo.read_file", "workspace.read_file", "fs.read_file"],
    network: ["http.get", "http.post", "dns.lookup"],
    deploy: ["deploy.vercel", "deploy.k8s", "deploy.ssh"],
    commerce: ["payments.charge", "billing.create_invoice"],
    write: ["repo.write_file", "workspace.write_file", "fs.write_file"],
    identity: ["oauth.login", "identity.lookup"],
    secrets: ["secrets.read", "secrets.write"],
    admin: ["admin.grant", "admin.revoke"]
  };

  function randomHash(prefix = "sha256") {
    const bytes = Array.from({ length: 32 }, () => rng.int(0, 255));
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}:${hex}`;
  }

  function makeAction({ actionClass, valid = true } = {}) {
    const cls = actionClass || rng.pick(actionClasses);
    const protocol = rng.pick(protocols);
    const target = rng.pick(targetsByClass[cls] || ["unknown.target"]);

    const action = {
      protocol,
      action_class: cls,
      target,
      input_hash: randomHash(),
      resource_refs: [`path_hash:${randomHash()}`],
      idempotency_key: `idem_${rng.int(1, 1_000_000)}`,
      trace_id: `trace_${rng.int(1, 1_000_000)}`
    };

    if (!valid) {
      const breaker = rng.int(0, 3);
      if (breaker === 0) action.protocol = "";
      if (breaker === 1) action.target = "";
      if (breaker === 2) action.input_hash = "";
      if (breaker === 3) action.action_class = "not_a_class";
    }

    return action;
  }

  const actions = [];
  for (let i = 0; i < 200; i++) actions.push(makeAction({ valid: true }));
  for (let i = 0; i < 40; i++) actions.push(makeAction({ valid: false }));
  actions.push(
    makeAction({ actionClass: "read", valid: true }),
    makeAction({ actionClass: "network", valid: true }),
    makeAction({ actionClass: "deploy", valid: true })
  );
  return actions;
}

export function makeFixtureAuthority() {
  return createReferenceAuthority();
}

export async function loadFixtureActions() {
  const allowReq = await readJson(repoPath("docs/fixtures/policy-evaluate-read-allow.request.json"));
  const deployReq = await readJson(repoPath("docs/fixtures/policy-evaluate-deploy-approval.request.json"));
  return {
    readAllow: allowReq.action,
    deployApproval: deployReq.action
  };
}

export function checkInvariants({ tokenPayload, action, evaluation }) {
  const normalized = parseActionDescriptor(action);
  if (normalized.status === "error") {
    if (evaluation.outcome !== "deny") {
      return { ok: false, code: "invariant.invalid_action_must_deny", details: { normalized, evaluation } };
    }
    return { ok: true };
  }

  const cls = normalized.value.action_class;
  const budget = evaluation.budget_effects;

  if (cls === "read" || cls === "network") {
    const hasScope = (tokenPayload.cap || []).includes(cls);
    if (!hasScope && evaluation.outcome !== "deny") {
      return { ok: false, code: "invariant.scope_missing_must_deny", details: { cls, evaluation } };
    }
  }

  if (evaluation.outcome === "deny" || evaluation.outcome === "allow_with_approval") {
    if (budget?.units_consumed !== 0) {
      return { ok: false, code: "invariant.no_budget_spend_on_deny_or_approval", details: { evaluation } };
    }
  }

  if ((evaluation.outcome === "allow" || evaluation.outcome === "allow_with_warning")
    && (cls === "read" || cls === "network")) {
    if (budget?.units_consumed !== 1) {
      return { ok: false, code: "invariant.read_network_spend_one_unit_on_allow", details: { cls, evaluation } };
    }
  }

  return { ok: true };
}

export function compareBenchmarks({ baseline, current, regressionTolerance = 0.05 }) {
  const failures = [];
  for (const key of Object.keys(current || {})) {
    if (typeof current[key] !== "number") continue;
    if (typeof baseline?.[key] !== "number") continue;
    const min = baseline[key] * (1 - regressionTolerance);
    if (current[key] < min) {
      failures.push({
        metric: key,
        baseline: baseline[key],
        current: current[key],
        min_allowed: min
      });
    }
  }
  return {
    ok: failures.length === 0,
    failures
  };
}
