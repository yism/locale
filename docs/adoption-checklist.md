# Adoption Checklist

## Issuer Requirements

- expose exactly three MCP tools: `capabilities.get`, `policy.evaluate`, `keys.get`
- support MCP `initialize`, `tools/list`, and `tools/call`
- issue JWS capability tokens with required claims only
- publish verification keys with stable `kid` values
- load policy packs from declarative files at startup

## Verifier Requirements

- verify capability and decision tokens offline against published keys
- reject expired, malformed, unknown-`kid`, and invalid-signature tokens deterministically
- locally preflight covered `read` and `network` actions without calling the authority
- call remote `policy.evaluate` only for uncovered or approval-gated actions

## Host Integration Requirements

- fetch a capability token once per mission or session
- cache the capability token and the current key set together
- normalize action descriptors before local preflight or remote evaluation
- attach capability or decision artifacts to local logs, traces, or receipts
- treat transport errors separately from policy outcomes

## Non-Requirements

- no secret brokerage
- no downstream tool execution
- no payment processing
- no workflow orchestration

## Golden Artifacts

- golden transcripts live under `/Users/mchap/Projects/Locale/docs/transcripts/`
- host profile fixtures live under `/Users/mchap/Projects/Locale/docs/host-profiles/`
- the reference orchestrator flow lives at `/Users/mchap/Projects/Locale/examples/orchestrator-flow.mjs`
- fixture-backed conformance inputs and outputs live under `/Users/mchap/Projects/Locale/docs/fixtures/`
