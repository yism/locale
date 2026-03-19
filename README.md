# Locale

Agent policy layer for safe tool use across MCP, A2A, and orchestrated agents.

Locale gives hosts, IDEs, and orchestrators a narrow policy boundary between agent intent and tool execution. It issues capabilities, verifies them offline, preflights low-risk actions locally, and evaluates higher-risk actions without turning into another orchestrator.

[![tests](https://img.shields.io/badge/tests-green-2ea043)](#trust-and-verification)
[![protocol](https://img.shields.io/badge/protocol-2026--03--v0.3-0969da)](./docs/chronology/2026-03-v0.3/manifest.json)
[![transport](https://img.shields.io/badge/mcp-stdio%20and%20http-6f42c1)](./docs/verification-workflow.md)
[![license](https://img.shields.io/badge/license-Apache%202.0-orange)](./LICENSE)

Locale is the project brand. The current package and runtime artifact is [`capability-policy-authority`](./package.json).

## Why agent teams need this now

Agents can call tools, delegate work, and cross system boundaries faster than policy and verification layers have caught up. Most teams do not need another orchestration system. They need a policy layer that fits into existing MCP hosts, A2A flows, and orchestrators without taking over execution.

Locale is built for that gap:

- issue short-lived capability tokens to agents and orchestrators
- verify capability and decision artifacts offline
- preflight covered low-risk actions locally
- evaluate uncovered or approval-gated actions remotely
- attach decision artifacts to logs, traces, receipts, and audit workflows

## What is an agent policy layer?

An agent policy layer sits between an agent deciding to act and the host actually executing the tool call. Locale keeps that layer narrow on purpose.

- it is not an orchestrator
- it does not execute downstream tools
- it does not broker secrets
- it does not handle payments

That narrow boundary is what makes it natural to integrate into existing systems instead of forcing a platform rewrite.

## How Locale works

See [docs/architecture.md](./docs/architecture.md) for the one-screen explainer and diagram.

The core flow is:

1. call `capabilities.get`
2. verify the capability token locally
3. locally preflight covered low-risk actions
4. call `policy.evaluate` for uncovered or approval-gated actions
5. if a suggestion is returned, present it to the user and call `policy.evolve`
6. publish or attach emitted artifacts to host-side logs or receipts

## How to control agent tool use

Locale gives a host two control paths:

- a fast local path for covered `read` and `network` actions
- a remote evaluation path for `deploy`, `write`, `commerce`, `identity`, `secrets`, and `admin`

That split keeps common actions fast while preserving strong policy control over higher-risk operations.

## MCP policy enforcement

Use Locale when you need MCP policy enforcement without turning your policy service into an executor.

The current MCP tool surface is:

- `capabilities.get`
- `policy.evaluate`
- `policy.evolve`
- `keys.get`

Reference mode and runtime mode keep the same tool names and request flow so a host can move from local development to production embedding without rewriting the integration boundary.

## A2A and orchestrator safety boundary

Locale is designed to feel natural inside multi-agent and A2A-style systems where one component delegates work to another. An orchestrator can issue one capability token per mission, distribute verified scopes to sub-agents, and keep decision artifacts with its own receipts and traces.

See [examples/orchestrator-flow.mjs](./examples/orchestrator-flow.mjs) for a complete flow:

- fetch a capability token once
- verify it locally
- preflight a covered `read`
- remotely evaluate a `deploy`

## Offline verification and attestation for agent actions

Locale publishes verification material so capability and decision artifacts can be checked offline. That matters when a host needs a stable trust boundary even if the authority is not on the hot path for every action.

The repo hardens that story with:

- golden transcripts in [docs/transcripts](./docs/transcripts/)
- named host profiles in [docs/host-profiles](./docs/host-profiles/)
- versioned chronology in [docs/chronology](./docs/chronology/)
- black-box compatibility coverage in [tests/compatibility.test.mjs](./tests/compatibility.test.mjs)

## Who should use Locale

### MCP builders

Use Locale when you need a policy boundary for MCP-native hosts, IDE integrations, and local tool-use preflight.

### A2A and multi-agent infrastructure teams

Use Locale when you need a capability and verification layer that can sit between delegating agents and the systems that ultimately execute tools.

### Platform, security, and enterprise teams

Use Locale when you need a narrow control layer for approvals, audit artifacts, policy packs, transcript replay, and rollout hardening.

## Quickstart

Run a local reference stdio MCP server:

```bash
npx capability-policy-authority serve-stdio
```

Run a local reference HTTP MCP server:

```bash
npx capability-policy-authority serve-http 8080
```

Inspect published verification keys:

```bash
npx capability-policy-authority keys
```

Register the stdio server with an MCP-native host using:

```json
{
  "command": "npx",
  "args": ["capability-policy-authority", "serve-stdio"]
}
```

Expected behavior in reference mode:

- `read` and `network` actions can be locally preflighted once covered by a token
- higher-risk actions remain approval-gated or denied by effective policy packs

## When to use Locale

- you need safe agent action control without replacing your host or orchestrator
- you need offline verification and attestation for agent-issued decisions
- you need policy packs and transcripts as part of the integration boundary
- you need the same public contract in local and cloud deployments

## When not to use Locale

- you want a workflow engine or orchestrator
- you need downstream tool execution
- you need secret brokerage
- you need payment handling

## Modes

Locale currently exposes two modes:

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

## Architecture and documentation

- docs index: [docs/index.md](./docs/index.md)
- architecture: [docs/architecture.md](./docs/architecture.md)
- local quickstart: [docs/quickstart-local.md](./docs/quickstart-local.md)
- cloud deployment: [docs/deploy-cloud.md](./docs/deploy-cloud.md)
- enterprise online deployment: [docs/enterprise-online.md](./docs/enterprise-online.md)
- integration patterns: [docs/integration-patterns.md](./docs/integration-patterns.md)
- integration fast path: [docs/integration-fast-path.md](./docs/integration-fast-path.md)
- MCP builder use cases: [docs/use-cases-mcp-builders.md](./docs/use-cases-mcp-builders.md)
- adoption checklist: [docs/adoption-checklist.md](./docs/adoption-checklist.md)
- verification workflow: [docs/verification-workflow.md](./docs/verification-workflow.md)
- product contract: [docs/capability-authority-v0.3.md](./docs/capability-authority-v0.3.md)
- migration guide: [docs/migration-v0.3.md](./docs/migration-v0.3.md)
- changelog: [docs/changelog.md](./docs/changelog.md)
- Codex skills: [docs/codex-skills.md](./docs/codex-skills.md)

## Trust and verification

Refresh generated artifacts:

```bash
npm run fixtures:refresh
```

Run the hardening suite:

```bash
npm test
```

The suite covers:

- conformance
- chronology
- pack precedence
- transport correctness
- transcript replay
- external verifier compatibility
- named host profiles

## License

This project is released under the [Apache License 2.0](./LICENSE). See [NOTICE](./NOTICE) for attribution details.

## Contributing

Public contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), use the issue templates for contract or docs drift, and keep large contract changes discussion-first.

## Sponsorship

If Locale helps you build safer agent systems, support the work through [GitHub Sponsors](https://github.com/sponsors/yism). Sponsorship helps fund open infrastructure for MCP, A2A, and multi-agent safety boundaries.
