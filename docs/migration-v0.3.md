# Migration to v0.3

## Summary

v0.3 keeps the existing MCP tools and adds one new tool:

- `capabilities.get`
- `policy.evaluate`
- `policy.evolve`
- `keys.get`

The product boundary remains evaluate-only.

## What changed

### Policy evolution is now a first-class flow

- `policy.evaluate` may return a `policy_suggestion`
- `policy.evolve` lets the host approve or reject that suggestion
- approved suggestions can be applied to session state or an optional durable policy store

### Scope overrides are now enforced

- `scope_overrides` participate in pack evaluation
- canonical typed `resource_refs` enable scope-aware denials and suggestions
- hashed refs still work, but they do not support scope-delta suggestions

### Federation is additive

- compact JWS capability and decision tokens remain the baseline
- optional VC/JWT and DID metadata can be enabled in runtime mode
- `keys.get` may now publish Agent Card and DID information

### Evidence capture is additive

- runtime deployments may append hash-chained JSONL ledger entries for evaluations and result records
- hosts still own execution and rollback execution

## Recommended migration

Reference mode stays the easiest way to run local fixtures and transcript generation:

```js
import { createReferenceAuthority } from "capability-policy-authority";

const authority = createReferenceAuthority();
```

Runtime mode can now add optional evolution, federation, and ledger modules:

```js
import {
  createAuthority,
  createEvidenceLedger,
  createFilePolicyStore,
  createPublishedJwks,
  loadPackDirectory,
  PROTOCOL_VERSION
} from "capability-policy-authority";
```

Construct the runtime explicitly with `createAuthority(config)` and add only the optional modules you need.

## What did not change

- JSON-RPC framing
- MCP protocol version
- baseline pack inclusion
- pack priority semantics
- evaluate-only boundary
- offline verification of compact JWS artifacts
