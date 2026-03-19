# Capability and Policy Authority v0.3

## Goal

Provide an MCP-native, evaluate-only authority with policy evolution hints, scope-aware pack enforcement, optional federated attestations, and an optional tamper-evident evidence ledger.

## Product Boundary

The authority still does not execute downstream actions. In v0.3 it does four things:

1. issue capability tokens
2. evaluate candidate actions
3. evolve policy after explicit user approval
4. publish verification keys and protocol metadata

Approval UX, tool execution, and rollback execution remain host responsibilities.

## MCP Surface

The public MCP tool set is now:

- `capabilities.get`
- `policy.evaluate`
- `policy.evolve`
- `keys.get`

## Core Objects

### `CapabilityToken`

The signed compact JWS capability token remains the baseline artifact for local verification and fast-path integrations.

### `Decision`

`policy.evaluate` continues to return deterministic decisions with:

- `outcome`
- `reason_codes`
- `message`
- `policy_version`
- `policy_packs`
- `budget_effects`
- `approval_requirements`
- `action_hash`
- `decision_token`

v0.3 may also include:

- `policy_suggestion`
- `federation_attestations`

### `PolicySuggestion`

Denied and approval-gated actions may carry a `policy_suggestion` with:

- `suggestion_id`
- `kind`
- `reason_code`
- `human_readable_reason`
- `minimal_delta`
- `action_hash`
- `expires_at`
- `persist_options`

### `Keys View`

`keys.get` still publishes JWKS-backed verification material. When federation is enabled it also publishes:

- issuer DID
- DID document
- supported attestation formats
- Agent Card metadata

## Scope-Aware Evaluation

v0.3 makes `scope_overrides` effective instead of inert.

- hashed `resource_refs` remain valid for privacy-preserving evaluation
- canonical typed refs such as `path:/etc/config` and `host:internal.example` unlock scope-aware suggestions
- exact, prefix, and glob-like scope matching are deterministic

## Evolution Workflow

1. host calls `policy.evaluate`
2. authority may return a `policy_suggestion`
3. host presents the suggestion to the user
4. host calls `policy.evolve` with the user decision
5. authority applies the change to session state or the configured policy store

## Optional Runtime Extensions

- file-backed policy evolution store for JSON or YAML overlays
- dual-stack VC/JWT federation metadata
- evidence ledger with hash-chained JSONL entries
- rollback-plan synthesis from recorded compensation metadata

