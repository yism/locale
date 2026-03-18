# Migration to v0.2

## Summary

v0.2 keeps the MCP tool names stable:

- `capabilities.get`
- `policy.evaluate`
- `keys.get`

The breaking changes are in the JavaScript package surface and runtime composition model.

## What changed

### Runtime construction is explicit

Before:

- `createAuthority()` implicitly used deterministic fixture keys, timestamps, and pack loading

Now:

- `createAuthority(config)` requires explicit runtime configuration
- `createReferenceAuthority()` provides the deterministic fixture runtime

### Reference behavior moved out of the root surface

Before:

- the root package exported raw reference key material

Now:

- the root package exports `createReferenceAuthority()` and `createReferenceKeys()`
- raw reference keys are no longer part of the root package API

### Parse and verify helpers use `status`

Before:

- helpers returned `ok: true|false`

Now:

- success shape uses `status: "ok"`
- failure shape uses `status: "error"` with stable `code` and `message`

## Recommended migration

For tests, examples, transcript generation, and local demos:

```js
import { createReferenceAuthority } from "capability-policy-authority";

const authority = createReferenceAuthority();
```

For production embedding:

```js
import {
  createAuthority,
  createPublishedJwks,
  loadPackDirectory,
  PROTOCOL_VERSION
} from "capability-policy-authority";
```

Create an explicit runtime config with your clock, issuer, signing key, published key set, pack store, token TTL, and protocol version.

## What did not change

- MCP tool names
- JSON-RPC framing
- MCP protocol version
- baseline pack inclusion
- pack priority semantics
- evaluate-only product boundary

