# Local Quickstart

## Goal

Run the reference authority locally in under a minute and attach it to an MCP-native host.

## Install and run

Start the reference stdio MCP server:

```bash
npx capability-policy-authority serve-stdio
```

Start the reference HTTP MCP server:

```bash
npx capability-policy-authority serve-http 8080
```

Inspect published verification keys:

```bash
npx capability-policy-authority keys
```

## Local MCP host registration

Use a stdio launcher like:

```json
{
  "command": "npx",
  "args": ["capability-policy-authority", "serve-stdio"]
}
```

## First useful calls

- `capabilities.get`
- `policy.evaluate`
- `policy.evolve`
- `keys.get`

## What you should see

- capability tokens issued as compact JWS
- offline-verifiable keys
- `read` actions allowed under baseline when covered
- `deploy` actions returned as `allow_with_approval` plus a structured suggestion

## Runtime embedding

For production use, embed the library and construct `createAuthority(config)` explicitly with your own:

- clock
- issuer
- signing key
- published JWKS
- pack store
- token TTL
- protocol version

## Local verification

Refresh artifacts:

```bash
npm run fixtures:refresh
```

Run tests:

```bash
npm test
```

## Reference materials

- [README.md](../README.md)
- [Migration v0.3](./migration-v0.3.md)
- [docs/integration-patterns.md](./integration-patterns.md)
- [docs/verification-workflow.md](./verification-workflow.md)
