# Adversarial self-improvement (ASI) loop

This repo is intentionally *evaluate-only*, so the self-improvement loop is expressed as:

- adversarial **inputs** (fuzz + transcript-derived corpora)
- stable **invariants** (must-hold properties)
- tracked **benchmarks** (must not regress beyond tolerance)
- automation-friendly **artifacts** (`tmp/asi/*.json`)

## What “adversarial” means here

The goal is to make the authority compete against its own previous behavior by continuously:

1. generating or replaying hard cases (invalid actions, edge budgets, scope mismatches)
2. checking safety invariants (no silent allow, no budget leakage)
3. measuring throughput of critical hot paths (`evaluateNormalizedAction`)
4. comparing to the last committed baseline

## Run it

- One-off run (writes `tmp/asi/report.json`): `npm run asi:run`
- Create/update baseline (commits `docs/benchmarks/asi-baseline.json`): `npm run asi:baseline`
- Check against baseline (fails only if `--fail-on-regression` + baseline present): `npm run asi:check`

## Outputs

The runner always writes:

- `tmp/asi/report.json`: full fuzz + benchmark details
- `tmp/asi/summary.json`: small summary for automation layers
- `tmp/asi/counterexample.json`: only when a fuzz invariant fails

## How to extend the loop

The ASI harness is designed to accept pressure signals from your existing workflow:

- add new transcript fixtures under `docs/transcripts/` and reuse them as corpus seeds
- add new invariants in `scripts/asi-lib.mjs` (`checkInvariants`)
- add new perf targets in `scripts/run-asi.mjs` (`benchTargets`)

If you run a host/orchestrator that already produces “transcript drift” or “research pressure” issues, treat each confirmed regression as:

- a new invariant (if it was a safety property), or
- a new benchmark metric (if it was a performance property), and
- a new fixture/transcript (if it was an integration property)

