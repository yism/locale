# Path Selection

Choose the smallest integration path that satisfies the host:

## Local stdio

Use when:

- the host already supports stdio MCP launchers
- the team wants the shortest path to a working local integration
- deterministic reference behavior is more important than runtime customization

Starter command:

```bash
npx capability-policy-authority serve-stdio
```

Starter launcher:

```json
{
  "command": "npx",
  "args": ["capability-policy-authority", "serve-stdio"]
}
```

## HTTP service

Use when:

- the host expects a remote MCP endpoint
- the team wants local and cloud parity with the same request and response shapes
- operational deployment concerns belong outside the host process

Starter command:

```bash
npx capability-policy-authority serve-http 8080
```

Required endpoints:

- `POST /mcp`
- `GET /health`

## Embedded runtime

Use when:

- the adopter must supply its own clock, issuer, signing key, published JWKS, or pack store
- the team needs production ownership of runtime composition while keeping the public MCP contract unchanged

Entry point:

```js
import { createAuthority } from "capability-policy-authority";
```

Do not use embedded runtime as an excuse to rename tools, change token semantics, or widen the product boundary.
