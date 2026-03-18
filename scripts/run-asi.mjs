import fs from "node:fs/promises";
import path from "node:path";
import { createEvaluator } from "../src/core/evaluator.mjs";
import {
  buildActionCorpus,
  checkInvariants,
  compareBenchmarks,
  loadFixtureActions,
  makeFixtureAuthority,
  nowNs,
  nsToMs,
  percentile,
  readJson,
  repoPath,
  writeJson
} from "./asi-lib.mjs";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const [k, v] = token.slice(2).split("=");
    if (v !== undefined) args.set(k, v);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) args.set(k, argv[++i]);
    else args.set(k, "true");
  }
  return args;
}

function benchOne({ evaluator, tokenPayload, action, iterations = 50_000 }) {
  const normalized = evaluator.parseAction(action);
  if (normalized.status === "error") throw new Error(`Cannot benchmark invalid action: ${normalized.code}`);

  for (let i = 0; i < 5_000; i++) {
    evaluator.evaluateTokenAction({ tokenPayload, normalizedAction: normalized.value });
  }

  const start = nowNs();
  for (let i = 0; i < iterations; i++) {
    evaluator.evaluateTokenAction({ tokenPayload, normalizedAction: normalized.value });
  }
  const elapsedNs = nowNs() - start;
  const elapsedMs = nsToMs(elapsedNs);
  const opsPerSec = iterations / (elapsedMs / 1000);
  return { iterations, elapsed_ms: elapsedMs, ops_per_sec: opsPerSec };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const seed = Number(args.get("seed") || "1");
  const fuzzIters = Number(args.get("fuzz") || "5000");
  const benchIters = Number(args.get("bench") || "50000");
  const regressionTolerance = Number(args.get("regress") || "0.05");
  const updateBaseline = args.get("update-baseline") === "true";
  const failOnRegression = args.get("fail-on-regression") === "true";

  const authority = makeFixtureAuthority();
  const capabilityReq = await readJson(repoPath("docs/fixtures/capabilities-get.request.json"));
  const capabilityRes = authority.issueCapability(capabilityReq);
  const verifierModule = await import("../src/verifier/index.mjs");
  const verified = verifierModule.verifyCapabilityToken(
    capabilityRes.capability_token,
    authority.getPublishedKeys(),
    new Date("2026-03-18T18:20:00Z")
  );
  if (verified.status === "error") {
    throw new Error(`Fixture capability token failed verification: ${verified.code}`);
  }
  const tokenPayload = verified.value.payload;

  const evaluator = createEvaluator({ packStore: authority.evaluator.packStore });
  const fixtureActions = await loadFixtureActions();

  const fuzzActions = buildActionCorpus({ seed });
  const fuzzFindings = [];
  for (let i = 0; i < Math.min(fuzzIters, fuzzActions.length); i++) {
    const action = fuzzActions[i];
    const res = authority.evaluateAction({ capabilityToken: capabilityRes.capability_token, action, verifier: verifierModule });
    const inv = checkInvariants({ tokenPayload, action, evaluation: res });
    if (!inv.ok) {
      fuzzFindings.push({ index: i, ...inv, action, evaluation: res });
      break;
    }
  }

  const benchSamples = [];
  const benchTargets = [
    { name: "evaluate.read_allow", action: fixtureActions.readAllow },
    { name: "evaluate.deploy_approval", action: fixtureActions.deployApproval }
  ];

  for (const target of benchTargets) {
    const sample = benchOne({ evaluator, tokenPayload, action: target.action, iterations: benchIters });
    benchSamples.push({ name: target.name, ...sample });
  }

  const ops = benchSamples.map((s) => s.ops_per_sec).sort((a, b) => a - b);
  const metrics = {
    ops_per_sec_p50: percentile(ops, 50),
    ops_per_sec_p10: percentile(ops, 10)
  };

  const report = {
    at: new Date().toISOString(),
    seed,
    params: {
      fuzz: fuzzIters,
      bench: benchIters,
      regress: regressionTolerance
    },
    fuzz: {
      ok: fuzzFindings.length === 0,
      findings: fuzzFindings
    },
    bench: {
      samples: benchSamples,
      metrics
    }
  };

  const outPath = repoPath("tmp/asi/report.json");
  await writeJson(outPath, report);

  const baselinePath = repoPath("docs/benchmarks/asi-baseline.json");
  let baseline = null;
  try {
    baseline = await readJson(baselinePath);
  } catch {
    baseline = null;
  }

  const comparison = compareBenchmarks({ baseline: baseline?.metrics, current: metrics, regressionTolerance });

  if (updateBaseline) {
    await writeJson(baselinePath, { updated_at: new Date().toISOString(), metrics });
  }

  const summaryPath = repoPath("tmp/asi/summary.json");
  await writeJson(summaryPath, {
    ok: report.fuzz.ok && (baseline ? comparison.ok : true),
    fuzz_ok: report.fuzz.ok,
    baseline_present: Boolean(baseline),
    benchmark_ok: baseline ? comparison.ok : null,
    regressions: comparison.failures,
    report_path: outPath
  });

  if (!report.fuzz.ok) {
    const findingPath = repoPath("tmp/asi/counterexample.json");
    await writeJson(findingPath, fuzzFindings[0]);
    process.exitCode = 1;
    return;
  }

  if (baseline && !comparison.ok) {
    if (failOnRegression) process.exitCode = 1;
  }

  if (!baseline) {
    await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  }
}

await run();
