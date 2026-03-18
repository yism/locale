# Verification Workflow

## Purpose

This workflow hardens the authority against silent regression as policy packs, transcripts, and transport behavior evolve.

In v0.2 it also guards the split between deterministic reference behavior and explicit runtime composition.

## Contract Layers

1. `tests/conformance.test.mjs`
   validates token issuance, runtime config requirements, offline verification, reason codes, and deterministic outcomes
2. `tests/packs.test.mjs`
   validates pack selection, precedence, and local preflight behavior
3. `tests/transport.test.mjs`
   validates MCP transport behavior, lifecycle state transitions, error separation, and framing
4. `tests/chronology.test.mjs`
   validates that the versioned chronology manifest matches the current public artifacts
5. `tests/compatibility.test.mjs`
   validates black-box transcript replay and external verifier-process compatibility
6. host profile fixtures under `docs/host-profiles/`
   pin named client handshake expectations that should continue to work as the layer evolves

## Refresh Sequence

When the public contract changes intentionally:

1. update the implementation
2. run `npm run fixtures:refresh`
3. run `npm test`
4. review the generated files in:
   - `docs/fixtures/`
   - `docs/transcripts/`
   - `docs/chronology/<protocol-version>/manifest.json`

If the contract did not intentionally change, any diff in those directories is a regression signal.

## Chronology Rules

- `docs/chronology/LATEST` points to the active protocol version
- each protocol version gets its own immutable manifest directory
- tracked hashes cover:
  - specs
  - fixtures
  - transcripts
  - policy packs
- changing those artifacts without updating chronology is a test failure
- changing runtime behavior so transcript replay no longer matches is a compatibility failure

## Hardening Goal

The authority should fail loudly when:

- transport behavior changes unexpectedly
- pack precedence drifts
- reason-code semantics drift
- transcripts no longer match the real handlers
- an external verifier process disagrees with the in-process verifier
- a named host profile no longer handshakes cleanly
- the versioned artifact set changes without an explicit chronology update
