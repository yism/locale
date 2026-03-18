# Conformance Spec v0.1

## Purpose

This document translates the product spec into pass and fail conditions that an implementation can test. It is intentionally narrow:

- capability issuance
- offline verification
- deterministic evaluation
- policy pack composition
- stable reason codes

It does not define execution semantics for downstream tools.

## Conformance Targets

An implementation is conformant for v0.1 only if it satisfies all of the following:

1. exposes the MCP tools defined in [capability-authority-v0.1.md](/Users/mchap/Projects/Locale/docs/capability-authority-v0.1.md)
2. issues verifiable capability tokens with all required claims
3. returns deterministic `policy.evaluate` outcomes for identical normalized inputs
4. applies `baseline` policy pack semantics by default
5. publishes verification material that allows offline validation of signed artifacts
6. returns only documented outcome values and stable reason codes

## Required Tool Contracts

### `capabilities.get`

The implementation must:

- accept a normalized subject or workload identifier
- require tenant, mission, and environment context
- include `baseline` in the effective pack list even if the caller omits it
- return a signed token whose `exp` is later than `iat`
- return the effective pack set used during issuance

The implementation must not:

- return provider credentials
- omit any required claims
- silently widen permissions beyond the effective policy packs

### `policy.evaluate`

The implementation must:

- accept either a supplied capability token or direct subject and mission references
- normalize the action descriptor before evaluating it
- return one of four outcomes only:
  - `allow`
  - `deny`
  - `allow_with_approval`
  - `allow_with_warning`
- return at least one reason code for every non-`allow` result
- return the policy version and effective pack set
- bind the `decision_token` to the evaluated action descriptor

The implementation must not:

- produce different outcomes for byte-identical normalized inputs
- treat unknown action classes as implicitly allowed
- return raw payloads if the request used hashes only

### `keys.get`

The implementation must:

- publish the active verification keys
- include a stable key identifier for each key
- publish supported token formats
- publish the current protocol version

The implementation must not:

- publish private signing material
- omit the currently active verification key set

## Normalization Rules

Before policy evaluation, the implementation must normalize:

- `protocol` values to lower-case canonical values
- `action_class` values to the canonical taxonomy
- `target` values to stable dotted identifiers
- unordered lists in context fields into a deterministic order

If normalization fails, the implementation must return `deny` with:

- `policy.unknown_action` for an unknown or unmappable action class, or
- `policy.context_missing` when required evaluation context is absent

## Determinism Rules

For v0.1, determinism means:

- same normalized request
- same policy version
- same policy packs
- same verification key set
- same budget state

must produce the same `outcome` and `reason_codes`.

Fields allowed to vary across equivalent responses:

- `message` wording, if the reason codes remain unchanged
- response timestamps
- opaque token serialization details that do not affect the verified claims

## Baseline Policy Conformance

An implementation is not conformant if the built-in `baseline` pack does not satisfy all of these:

1. `read` actions are allowed unless restricted by environment or explicit pack overlay
2. `write`, `deploy`, `commerce`, `identity`, `secrets`, and `admin` actions require approval unless explicitly allowed
3. unknown action classes are denied
4. expired or unverifiable tokens are denied
5. exhausted budgets are denied

## Policy Pack Composition Conformance

The implementation must enforce:

1. `baseline` is always present in the effective pack set
2. stricter pack outcomes override more permissive outcomes
3. every `Decision` reports the final effective pack set
4. pack composition is deterministic for the same requested pack set and policy version

## Reason Code Conformance

The following reason codes are reserved for v0.1 and must preserve their semantics:

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

An implementation may add more reason codes, but it must not redefine these.

## Token Verification Conformance

Capability tokens and decision tokens must support offline verification against the material returned by `keys.get`.

At minimum, a verifier must be able to:

1. select the correct key using `kid`
2. verify the signature
3. inspect the required claims
4. compare `exp` against current time with bounded clock skew
5. reject tokens whose issuer or format is not supported

## Required Test Scenarios

Every implementation must pass these scenarios.

### `CT-001` Capability issuance includes `baseline`

Input:

- caller requests only `enterprise-strict`

Expected:

- returned token contains both `baseline` and `enterprise-strict`

### `CT-002` Capability token is time-bounded

Input:

- valid `capabilities.get` request

Expected:

- `exp` exists and is later than `iat`

### `PE-001` Baseline `read` action is allowed

Input:

- valid capability token
- `action_class = read`
- target within allowed scope

Expected:

- outcome is `allow`

### `PE-002` Baseline `deploy` action requires approval

Input:

- valid capability token issued under `baseline`
- `action_class = deploy`

Expected:

- outcome is `allow_with_approval`
- `policy.approval_required` is present

### `PE-003` Expired token is denied

Input:

- expired capability token
- otherwise valid `read` action

Expected:

- outcome is `deny`
- `token.expired` is present

### `PE-004` Unknown action class is denied

Input:

- valid token
- `action_class = quantum`

Expected:

- outcome is `deny`
- `policy.unknown_action` is present

### `PE-005` Exhausted budget is denied

Input:

- valid token with depleted budget for the proposed class

Expected:

- outcome is `deny`
- `token.budget_exhausted` is present

### `KG-001` Key publication supports offline verification

Input:

- `keys.get`

Expected:

- response includes current key set, `kid`, supported formats, and protocol version

## Fixture Set

Reference fixtures live under:

- [/Users/mchap/Projects/Locale/docs/fixtures/capabilities-get.request.json](/Users/mchap/Projects/Locale/docs/fixtures/capabilities-get.request.json)
- [/Users/mchap/Projects/Locale/docs/fixtures/capabilities-get.response.json](/Users/mchap/Projects/Locale/docs/fixtures/capabilities-get.response.json)
- [/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-read-allow.request.json](/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-read-allow.request.json)
- [/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-read-allow.response.json](/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-read-allow.response.json)
- [/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-deploy-approval.request.json](/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-deploy-approval.request.json)
- [/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-deploy-approval.response.json](/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-deploy-approval.response.json)
- [/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-expired-token.response.json](/Users/mchap/Projects/Locale/docs/fixtures/policy-evaluate-expired-token.response.json)
- [/Users/mchap/Projects/Locale/docs/fixtures/keys-get.response.json](/Users/mchap/Projects/Locale/docs/fixtures/keys-get.response.json)

These fixtures are illustrative and should remain stable unless the public contract changes.

## Human Escalation Cases

The implementation or its automations must stop for review if:

- a protocol change invalidates offline verification
- pack composition would require a new override model
- determinism cannot be preserved without moving evaluation state into execution systems
- a proposed extension requires raw secrets, raw payload storage, or downstream execution
