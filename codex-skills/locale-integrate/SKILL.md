---
name: "locale-integrate"
description: "Use when integrating Locale's capability-policy-authority package into a Node MCP host, IDE, orchestrator, or service. Choose between stdio, HTTP, or embedded runtime integration, preserve the three-tool contract (`capabilities.get`, `policy.evaluate`, `keys.get`), require offline token verification plus local preflight for covered `read` and `network`, and refuse requests that would turn Locale into an execution broker, secret manager, payment layer, or orchestrator."
---

# Locale Integrate

Use this skill for adoption work in external codebases.

Prefer the narrowest viable integration path:

1. `serve-stdio` for local MCP-host registration and fast iteration
2. `serve-http` for service deployment with the same MCP contract
3. `createAuthority(config)` when the host needs embedded production runtime control

## Required invariants

- Keep the public contract to `capabilities.get`, `policy.evaluate`, and `keys.get`.
- Require offline verification of capability and decision tokens against published keys.
- Require local preflight for covered `read` and `network` actions once a token is verified.
- Use remote `policy.evaluate` only for uncovered or approval-gated actions.
- Keep transport failures separate from policy outcomes in host logic.

## Refusal boundary

Do not widen Locale into:

- downstream tool execution
- secret management
- payment handling
- workflow orchestration

If the requested integration needs one of those, say Locale is the wrong layer and stop widening the design.

## Workflow

1. Identify the adopter path from the host constraints.
2. Load the matching reference:
   - path selection: `references/path-selection.md`
   - contract and host obligations: `references/public-contract.md`
   - compatibility gate: `references/compatibility-gate.md`
3. If the user needs starter config, run `scripts/emit_mcp_registration.sh`.
4. If a Locale checkout is available, run `scripts/run_minimum_compatibility_check.mjs` before calling the integration complete.
5. Produce code or config changes in the adopter repo without changing Locale's contract.

## Repo-aware references

If the current workspace is the Locale repo, cross-check against:

- `docs/integration-fast-path.md`
- `docs/integration-patterns.md`
- `docs/adoption-checklist.md`
- `docs/use-cases-mcp-builders.md`
- `docs/quickstart-local.md`
- `docs/architecture.md`
- `docs/migration-v0.2.md`
- `examples/orchestrator-flow.mjs`
