# Public Contract

Locale is an evaluate-only capability authority.

## MCP tools

The integration must expose exactly:

- `capabilities.get`
- `policy.evaluate`
- `keys.get`

## Host responsibilities

- fetch one capability token per mission or session
- cache the capability token with the current key set
- verify capability and decision tokens offline
- normalize action descriptors before local preflight or remote evaluation
- locally preflight covered `read` and `network`
- call remote `policy.evaluate` for uncovered or approval-gated actions
- attach decision artifacts to logs, traces, or receipts
- treat transport failures separately from policy outcomes

## Non-requirements

Locale does not perform:

- tool execution
- secret brokerage
- payment handling
- workflow orchestration

If the requested system needs those behaviors, integrate another layer next to Locale instead of pushing Locale across the boundary.
