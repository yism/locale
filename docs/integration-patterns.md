# Integration Patterns

## IDE host pattern

1. register the stdio server
2. call `capabilities.get` once per session or mission
3. verify the token locally
4. locally preflight `read` and `network`
5. call `policy.evaluate` for uncovered or approval-gated actions
6. if the authority returns `policy_suggestion`, present it to the user and call `policy.evolve`

## Orchestrator pattern

1. fetch one capability token per orchestrator mission
2. pass token payloads or derived scopes to sub-agents
3. use offline verification and local preflight in workers
4. attach decision artifacts to logs, traces, or receipts

See [examples/orchestrator-flow.mjs](../examples/orchestrator-flow.mjs).

## Reference and runtime split

- use `createReferenceAuthority()` for deterministic examples, transcript replay, and local compatibility checks
- use `createAuthority(config)` for embedded production hosts and services
- keep the MCP tool names and request/response flow aligned across both modes

## Local and cloud parity

Use the same request and response shapes in both environments.

- local stdio:

```bash
npx capability-policy-authority serve-stdio
```

- cloud HTTP:

```bash
npx capability-policy-authority serve-http 8080
```

The packaged HTTP server is reference-mode. For enterprise traffic, embed `createAuthority(config)` plus `createHttpHandler()` in your existing service boundary.

## Transcript replay pattern

Use generated transcripts and host profiles as the minimum compatibility gate:

- [docs/transcripts](./transcripts)
- [docs/host-profiles](./host-profiles)

If a host cannot replay its named profile cleanly, integration is not complete.

## Comparison guidance

Use this when you need:

- evaluation
- attestation
- offline verification
- capability issuance

Do not use this when you need:

- downstream execution
- secret management
- orchestration
- payment flows
