# Capability and Policy Authority v0.1

## Goal

Provide an MCP-native, evaluate-only authority that trusted orchestrators can call to obtain short-lived capability tokens for sub-agents and to evaluate edge-case actions.

The product target is not "all developers". It is:

- orchestrators
- agent hosts
- IDEs that embed agent workflows
- agent-native infrastructure that needs a stable preflight handshake

## Product Boundary

The authority does exactly three things:

1. issue capability tokens
2. evaluate candidate actions
3. publish verification keys and protocol metadata

It does not execute the action being evaluated.

## Core Objects

### `CapabilityToken`

A signed, short-lived artifact issued to an orchestrator. The orchestrator may pass it to sub-agents, or attenuate it into narrower internal scopes.

Required claims:

- `iss`: authority identifier
- `sub`: orchestrator workload identifier
- `tid`: tenant identifier
- `mid`: mission identifier
- `env`: environment identifier such as `dev`, `staging`, or `prod`
- `iat`: issued-at time
- `exp`: expiration time
- `kid`: signing key identifier
- `pver`: policy version
- `packs`: policy packs applied during issuance
- `cap`: allowed action classes or tool patterns
- `bud`: budgets and ceilings
- `ctx`: optional hashed context references such as repo, project, or workspace

### `ActionDescriptor`

A normalized description of a proposed call.

Required fields:

- `protocol`: `mcp`, `http`, `cli`, `acp`, `ucp`, `atxp`, or `custom`
- `action_class`: canonical class such as `read`, `write`, `deploy`, `commerce`, `identity`, `network`, or `secrets`
- `target`: stable action name such as `vercel.deploy` or `stripe.create_checkout`
- `input_hash`: digest of the raw payload
- `resource_refs`: optional redacted or hashed resource identifiers
- `idempotency_key`: caller-generated dedupe key
- `trace_id`: correlation identifier

### `Decision`

A deterministic policy result for one `ActionDescriptor`.

Required fields:

- `outcome`: `allow`, `deny`, `allow_with_approval`, or `allow_with_warning`
- `reason_codes`: machine-readable policy reasons
- `message`: short human-readable explanation
- `policy_version`: effective policy version
- `policy_packs`: effective pack list
- `budget_effects`: estimated budget consumption or threshold breach
- `approval_requirements`: any approval classes required before execution
- `decision_token`: signed artifact that binds the decision to the evaluated action

## MCP Surface

The v0.1 MCP surface stays intentionally small.

### `capabilities.get`

Issues a new `CapabilityToken`.

Input:

- orchestrator identity
- tenant and mission references
- environment
- optional context references
- requested policy pack set

Output:

- `CapabilityToken`
- token expiry
- effective packs
- issuance warnings

### `policy.evaluate`

Evaluates an `ActionDescriptor` against either:

- a provided `CapabilityToken`, or
- a subject and mission reference when no token exists yet

Output:

- `Decision`

### `keys.get`

Publishes current public verification keys and metadata.

Output:

- signing keys
- supported token formats
- current policy pack catalog
- current protocol version

## Baseline Taxonomy

The baseline action classes should be stable and small:

- `read`
- `write`
- `network`
- `deploy`
- `commerce`
- `identity`
- `secrets`
- `admin`

If a provider-specific tool does not map cleanly into one of these, the taxonomy is wrong or too narrow.

## Baseline Safety Policy

Zero-config adoption requires a default policy pack.

### Default behavior

- allow low-risk `read` actions
- allow bounded `network` actions when the target is already in the capability token
- require approval for `write`, `deploy`, `commerce`, `identity`, `secrets`, and `admin` unless explicitly allowed by pack or mission
- deny unknown action classes
- deny expired or unverifiable capability tokens

### Default budget posture

- low-risk actions consume rate budget only
- high-risk actions consume a dedicated action-class budget
- once a budget is exhausted, the evaluator returns `deny` with the matching reason code

## Policy Packs

Policy customization should be pack-oriented, not rule-edit-oriented.

Built-in packs:

- `baseline`
- `enterprise-strict`
- `regulated-data`
- `commerce-guarded`
- `ci-noninteractive`

Rules for pack composition:

1. `baseline` is always present
2. stricter pack outcomes override more permissive outcomes
3. enterprise overlays may narrow but not silently widen a stricter built-in pack without an explicit version change
4. every decision must include the final pack set used

## Token and Decision Format

The default format should be JWS-compatible because adoption matters more than elegance in v0.1.

Why:

- widespread verifier support
- easy key distribution via JWKS-like metadata
- works cleanly with offline verification

Future COSE support can be added later without breaking semantics.

## Reason Codes

Reason codes must be stable and machine-readable. Suggested initial set:

- `token.expired`
- `token.invalid_signature`
- `token.scope_missing`
- `token.budget_exhausted`
- `policy.class_denied`
- `policy.pack_denied`
- `policy.approval_required`
- `policy.context_missing`
- `policy.unknown_action`
- `policy.environment_restricted`

## Security Posture

### Required properties

- deterministic decisions
- offline verification support
- short token lifetimes
- signing key rotation with explicit `kid`
- no raw provider credentials in requests
- hashed payloads by default

### Explicit non-goals

- executing downstream tools
- storing provider API keys
- making payment or deployment calls
- acting as a generalized orchestrator

## Adoption Contract

An orchestrator integration should be able to:

1. call `capabilities.get` once per mission or session
2. verify the token locally
3. make local preflight decisions for ordinary calls covered by the token
4. call `policy.evaluate` only for uncovered or exceptional actions
5. attach the token or decision token to its own logs or receipts

If adoption requires more than this, the product is too heavy.

## Open Questions

These should stay open until implementation pressure forces a decision:

- revocation semantics beyond short TTL and key rotation
- whether decision tokens need a separate format from capability tokens
- whether `policy.explain` belongs in v0.1 or only in a later ergonomics pass
- whether pack metadata belongs inside `keys.get` or a separate discovery tool
