# Capability and Policy Authority v0.2

## Goal

Provide an MCP-native, evaluate-only authority with explicit runtime composition, deterministic reference behavior, and stable wire semantics for agent hosts, orchestrators, IDEs, and enterprise platform teams.

## Operating Modes

### Reference mode

Use reference mode when you need:

- deterministic fixtures
- transcript replay
- documentation examples
- black-box compatibility tests
- local evaluation demos

Reference mode is exposed through `createReferenceAuthority()` and the packaged CLI commands.

### Runtime mode

Use runtime mode when you embed this layer in a real host or service.

Runtime mode requires `createAuthority(config)` with explicit:

- `clock.now()`
- `issuer`
- `signingKey`
- `publishedJwks`
- `packStore`
- `tokenTtlSeconds`
- `protocolVersion`

If those are not supplied, construction fails deterministically.

## Product Boundary

The authority does exactly three things:

1. issue capability tokens
2. evaluate candidate actions
3. publish verification keys and protocol metadata

It still does not execute the action being evaluated.

## Core Objects

### `CapabilityToken`

A signed, short-lived artifact issued to an orchestrator or host boundary.

Required claims remain:

- `iss`
- `sub`
- `tid`
- `mid`
- `env`
- `iat`
- `exp`
- `kid`
- `pver`
- `packs`
- `cap`
- `bud`
- `ctx`

### `ActionDescriptor`

A normalized description of a proposed call.

Required fields remain:

- `protocol`
- `action_class`
- `target`
- `input_hash`
- `resource_refs`
- `idempotency_key`
- `trace_id`

Action parsing in v0.2 is explicit:

- success: `{ status: "ok", code: "ok", value }`
- failure: `{ status: "error", code, message, details }`

### `Decision`

A deterministic policy result for one `ActionDescriptor`.

Required fields:

- `outcome`
- `reason_codes`
- `message`
- `policy_version`
- `policy_packs`
- `budget_effects`
- `approval_requirements`
- `action_hash`
- `decision_token`

## Security Boundaries

v0.2 makes trust boundaries explicit:

- signing service owns private-key use only
- verifier owns offline verification only
- authority coordinates issuance and evaluation but does not embed fixture defaults
- pack loading and validation stay isolated in the pack repository

Every externally visible denial or validation failure must map to a stable machine code and human-readable message.

## Adoption Contract

An integration should be able to:

1. call `capabilities.get`
2. verify the token locally
3. preflight covered low-risk actions locally
4. call `policy.evaluate` for uncovered or approval-gated actions
5. attach capability or decision artifacts to host-side logs, traces, or receipts

The wire contract stays intentionally narrow even though the runtime architecture is now explicit.

