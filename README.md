# Capability Policy Authority

MCP-native capability and policy authority for evaluate-only agent preflight, verification, and attestation.

[![tests](https://img.shields.io/badge/tests-green-2ea043)](#verification)
[![protocol](https://img.shields.io/badge/protocol-2026--03--v0.2-0969da)](./docs/chronology/2026-03-v0.2/manifest.json)
[![transport](https://img.shields.io/badge/mcp-stdio%20and%20http-6f42c1)](./docs/verification-workflow.md)

## Why this exists

Use this when you need a thin MCP-native dependency that:

- issues short-lived capability tokens to orchestrators
- evaluates proposed tool calls without executing them
- publishes verification keys for offline validation
- hardens agent workflows with transcripts, host profiles, chronology, and conformance tests

Do not use this when you need:

- tool execution
- secret brokerage
- workflow orchestration
- payment handling

## How it works

See [docs/architecture.md](./docs/architecture.md) for the one-screen explainer and diagram.

The core flow is:

1. `capabilities.get`
2. local offline verification
3. local preflight for covered low-risk actions
4. `policy.evaluate` for uncovered or approval-gated actions
5. attach emitted artifacts to host-side logs or receipts

## Who should use this

- MCP builders
- IDE teams
- agent hosts
- orchestrator and workflow-engine teams

## Why this stays narrow

This stays useful because it remains an evaluate-only dependency layer.

- not an orchestrator
- not a secret broker
- not a payment layer
- not a workflow engine

## Modes

This repo now exposes two explicit modes:

- reference mode for deterministic fixtures, examples, transcript replay, and the packaged CLI
- runtime mode for embedded hosts and services that supply their own clock, issuer, keys, and pack store

Reference mode:

```js
import { createReferenceAuthority } from "capability-policy-authority";

const authority = createReferenceAuthority();
```

Runtime mode:

```js
import {
  createAuthority,
  createPublishedJwks,
  loadPackDirectory,
  PROTOCOL_VERSION
} from "capability-policy-authority";
```

## Use it in one line

Run a local reference stdio MCP server:

```bash
npx capability-policy-authority serve-stdio
```

Run a local reference HTTP MCP server:

```bash
npx capability-policy-authority serve-http 8080
```

Inspect published keys:

```bash
npx capability-policy-authority keys
```

## 60-second local quickstart

1. Start the authority:

```bash
npx capability-policy-authority serve-stdio
```

2. Register it with an MCP-native host using stdio.

Example launcher:

```json
{
  "command": "npx",
  "args": ["capability-policy-authority", "serve-stdio"]
}
```

3. Ask the host to call:

- `capabilities.get`
- `policy.evaluate`
- `keys.get`

Expected behavior in reference mode:

- `read` and `network` actions can be locally preflighted once covered by a token
- `deploy`, `write`, `commerce`, `identity`, `secrets`, and `admin` remain approval-gated or denied by effective policy packs

## Practical use cases

- **IDE preflight gate**: an MCP host fetches one capability token and locally preflights covered low-risk actions before remote evaluation.
- **Orchestrator boundary layer**: a workflow engine issues tokens to sub-agents and attaches decision artifacts to its own logs.
- **Enterprise policy shim**: a platform team deploys the authority in front of agent workflows to enforce pack-driven policy without executing tools.
- **Compatibility oracle**: a host team replays golden transcripts and host profiles to validate its integration before rollout.
- **Research-to-hardening bridge**: chronology and automation turn protocol or threat-model pressure into bounded compatible changes.

## Black-box example

The repo includes a complete transcript replay and verifier-process harness:

- golden transcripts: [docs/transcripts](./docs/transcripts/)
- host profiles: [docs/host-profiles](./docs/host-profiles/)
- black-box tests: [tests/compatibility.test.mjs](./tests/compatibility.test.mjs)

## Orchestrator example

See [examples/orchestrator-flow.mjs](./examples/orchestrator-flow.mjs) for a complete flow:

- fetch a capability token once
- verify it locally
- preflight a covered `read`
- remotely evaluate a `deploy`

## Documentation

- docs index: [docs/index.md](./docs/index.md)
- Codex skills: [docs/codex-skills.md](./docs/codex-skills.md)
- architecture: [docs/architecture.md](./docs/architecture.md)
- v0.2 product contract: [docs/capability-authority-v0.2.md](./docs/capability-authority-v0.2.md)
- migration guide: [docs/migration-v0.2.md](./docs/migration-v0.2.md)
- local quickstart: [docs/quickstart-local.md](./docs/quickstart-local.md)
- cloud deployment: [docs/deploy-cloud.md](./docs/deploy-cloud.md)
- integration patterns: [docs/integration-patterns.md](./docs/integration-patterns.md)
- integration fast path: [docs/integration-fast-path.md](./docs/integration-fast-path.md)
- MCP builder use cases: [docs/use-cases-mcp-builders.md](./docs/use-cases-mcp-builders.md)
- compare and decide: [docs/compare-and-decide.md](./docs/compare-and-decide.md)
- adoption checklist: [docs/adoption-checklist.md](./docs/adoption-checklist.md)
- verification workflow: [docs/verification-workflow.md](./docs/verification-workflow.md)
- changelog: [docs/changelog.md](./docs/changelog.md)

## Verification

Refresh generated artifacts:

```bash
npm run fixtures:refresh
```

Run the full hardening suite:

```bash
npm test
```

The suite covers:

- conformance
- chronology
- pack precedence
- transport correctness
- black-box transcript replay
- external verifier compatibility
- named host profiles

## Cloud and enterprise

Run in HTTP mode locally or in a container:

```bash
npx capability-policy-authority serve-http 8080
```

Then point a host or orchestrator to `/mcp` and use `/health` for health checks.

The local and cloud stories intentionally share:

- the same MCP tools
- the same packs
- the same transcripts
- the same verification workflow

The difference in v0.2 is that the packaged CLI is the deterministic reference runtime, while embedded production deployments should construct `createAuthority(config)` explicitly.
