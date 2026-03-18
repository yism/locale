# Change Pipeline

## Goal

Keep the primitive aligned with protocol and research evolution without widening the product boundary by accident.

## Source Tiers

### Tier 1: Normative

These sources may drive contract changes directly:

- official MCP, ACP, UCP, and ATXP specifications
- major host and reference implementations when they expose a de facto interoperability requirement

### Tier 2: Pressure Signals

These sources may change conformance, threat modeling, or future planning, but not the public contract by default:

- fresh preprints on capability delegation
- tool-use governance and attestation research
- multi-agent safety and permissioning work
- agent security failure analyses

### Tier 3: Ecosystem Fit

These sources may drive ergonomics changes:

- IDE and agent-host integration friction
- conformance failures in external adopters
- host-side logging and tracing needs

## Decision Rules

1. Tier 1 can change the contract.
2. Tier 2 can only change the contract if it exposes:
   - a concrete flaw in the current public contract
   - a materially better delegation or verification primitive
   - a clear host-adoption blocker
3. Tier 3 can change tooling, examples, checklists, transcripts, and conformance cases, but not token claims or MCP tool names without human review.

## Mandatory Human Review

Human review is required for any change to:

- token claims
- reason-code semantics
- action taxonomy
- pack precedence
- MCP tool names
- MCP request and response shapes

## Default Outcome Classes

Every automation or review loop must classify findings as one of:

- `no change`
- `compatible change`
- `blocking change`
- `future watch`

Only `compatible change` may result in an autonomous doc or conformance patch.

## Required Artifacts

Every accepted change must update all affected artifacts together:

- spec docs
- fixtures
- transcripts
- tests
- adoption checklist if host behavior changes

If a proposed change cannot be reflected across all five, it does not merge.
