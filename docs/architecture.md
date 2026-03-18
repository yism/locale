# Architecture

## One-screen model

This repository exposes a thin, evaluate-only MCP-native layer:

- `capabilities.get`
- `policy.evaluate`
- `keys.get`

It exists to let an MCP host or orchestrator:

1. fetch a short-lived capability token
2. verify it locally
3. locally preflight covered low-risk actions
4. remotely evaluate uncovered or approval-gated actions
5. attach decision artifacts to its own logs, traces, or receipts

In v0.2 the runtime is explicit:

- reference mode backs fixtures, transcripts, docs, and the packaged CLI
- runtime mode requires explicit clock, issuer, key, and pack-store configuration

## Diagram

```mermaid
flowchart LR
  subgraph Host["MCP Host or Orchestrator"]
    H1["Fetch capability token"]
    H2["Verify token locally"]
    H3["Preflight low-risk action"]
    H4["Call remote policy evaluate"]
    H5["Attach decision artifacts to logs"]
  end

  subgraph Authority["Capability Policy Authority"]
    A1["capabilities.get"]
    A2["policy.evaluate"]
    A3["keys.get"]
    A4["Policy packs"]
    A5["JWS signing and verification keys"]
  end

  subgraph Hardening["Hardening and Immutability"]
    D1["Golden transcripts"]
    D2["Host profiles"]
    D3["Chronology manifest"]
    D4["Verification workflow"]
    D5["Conformance and compatibility tests"]
  end

  H1 --> A1
  H2 --> A3
  H3 --> H5
  H4 --> A2
  A1 --> A4
  A2 --> A4
  A1 --> A5
  A2 --> A5
  A3 --> A5
  D1 --> D5
  D2 --> D5
  D3 --> D4
  D4 --> D5
  A1 --> D1
  A2 --> D1
  A3 --> D1
  A1 --> D3
  A2 --> D3
  A3 --> D3
```

Source: [architecture.mmd](./architecture.mmd)

## How it works

- `capabilities.get` issues a short-lived capability token for an orchestrator mission context.
- `keys.get` publishes offline verification material.
- `policy.evaluate` returns a deterministic policy result for a normalized action descriptor.
- authority construction is explicit in runtime mode and deterministic in reference mode
- transport lifecycle is modeled as a session state machine instead of informal booleans

## Why this stays narrow

This layer is intentionally not:

- an orchestrator
- a secret broker
- a payment layer
- a workflow engine

Its job is evaluation and attestation only.

## Truth sources

This explainer is valid only insofar as it matches the current repo truth:

- transcripts: [docs/transcripts](./transcripts)
- host profiles: [docs/host-profiles](./host-profiles)
- chronology: [docs/chronology](./chronology)
- verification workflow: [docs/verification-workflow.md](./verification-workflow.md)

If any of those change, this explainer must change with them.
