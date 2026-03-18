# Protocol Foundations

## Scope

This project is not an orchestrator, payment rail, or secret vault. The product boundary is narrower:

- issue signed capability tokens to trusted orchestrators
- evaluate proposed tool calls against policy
- publish verification keys and reason codes

Everything else stays outside the core. That keeps the layer adoptable, low-liability, and useful across protocols that will continue to shift.

## Source Constraints

### MCP

The Model Context Protocol gives the immediate integration surface:

- tool discovery and invocation already exist
- hosts and servers already negotiate capability surfaces
- MCP authorization aligns with OAuth 2.1 style constraints and explicitly guards against token confusion and token passthrough

Design consequence: this product should expose a very small MCP tool surface and never depend on custom transport semantics.

### ACP

Agent Communication Protocol matters because orchestrators will hand work to sub-agents. ACP pushes toward:

- asynchronous delegation
- machine-readable capabilities
- low-friction discovery

Design consequence: capabilities must be short-lived, signed, and verifiable offline by sub-agents and executors. The authority cannot be on the hot path for every sub-agent action.

### UCP

Universal Commerce Protocol is relevant as a future consumer of policy, not as the product boundary. The likely long-term need is:

- normalizing commerce actions into stable action classes
- attaching consent, spending, and approval rules
- keeping the evaluator out of direct funds flow

Design consequence: the taxonomy must support commerce-class actions even though the product will not execute them.

### ATXP

ATXP demonstrates a parallel market pressure:

- agents should not manage provider keys or accounts directly
- operators want one stable access layer for inference and paid tools

Design consequence: this product should interoperate with account and transaction layers, but not absorb them. It should evaluate requests that target ATXP-backed tools the same way it evaluates any other tool family.

### Predecessors

The design should borrow from older, settled primitives instead of inventing new governance semantics:

- JSON-RPC 2.0 for request and response determinism
- OAuth 2.x and OIDC for workload identity and audience binding
- JWS and JWKS for signed, offline-verifiable artifacts
- capability-based security for delegation with attenuation
- OpenTelemetry style trace correlation for audit stitching

## Invariants

These are non-negotiable.

1. The authority does not execute downstream actions.
2. The authority does not store long-lived third-party credentials.
3. The authority can be verified offline by consumers.
4. The authority returns deterministic policy decisions for identical inputs.
5. The authority defaults to minimal PII. Hashes and opaque identifiers are the default.
6. The authority must be usable with zero customization for an orchestrator that wants baseline safety.
7. Enterprises must be able to layer stricter policy packs without changing the protocol handshake.

## Product Position

The narrowest useful primitive is not "run orchestration" and not "tool brokerage". It is:

`Capability and Policy Authority`

The authority has three responsibilities:

- issue a signed capability token for an orchestrator and mission context
- evaluate a proposed action that falls outside the current token or needs an explicit reasoned decision
- publish verification material and policy metadata so others can trust the handshake

## What This Is Not

- not a hosted MCP marketplace
- not a workflow engine
- not an approval UI
- not a secret manager
- not a payment processor
- not an agent runtime

If the design starts pulling those concerns in, the product will stop being a dependency and start becoming a competitor to the systems it should sit underneath.
