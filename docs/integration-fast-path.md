# Integration Fast Path

## Local stdio

Run:

```bash
npx capability-policy-authority serve-stdio
```

Register an MCP host with:

```json
{
  "command": "npx",
  "args": ["capability-policy-authority", "serve-stdio"]
}
```

## Cloud HTTP

Run:

```bash
npx capability-policy-authority serve-http 8080
```

Use:

- `POST /mcp`
- `GET /health`

This packaged HTTP path is the reference runtime. For enterprise deployment, embed `createAuthority(config)` in your own service bootstrap and expose `createHttpHandler()` through your existing ingress stack.

## Minimum compatibility check

Before shipping an integration:

1. replay the generated transcripts
2. validate the named host profile
3. verify emitted capability and decision tokens offline
4. confirm `policy.evolve` works for a representative approval-gated flow

## Constructor boundary

Use the packaged CLI for deterministic reference-mode integration checks.

For production embedding, construct the authority explicitly with `createAuthority(config)` and keep the v0.3 MCP tool contract intact.

## Truth-backed references

- [Architecture](./architecture.md)
- [Migration v0.2](./migration-v0.2.md)
- [Integration Patterns](./integration-patterns.md)
- [Enterprise Online Deployment](./enterprise-online.md)
- [Verification Workflow](./verification-workflow.md)
- [Host Profiles](./host-profiles)
