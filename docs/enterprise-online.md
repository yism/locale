# Enterprise Online Deployment

## Goal

Run Locale as an embedded backend component inside an existing internal Node service or MCP gateway, not as a standalone product with its own frontend.

## Current limitations

- the packaged `serve-http` CLI path is reference-mode only and is meant for compatibility checks, transcript replay, and local or containerized demos
- the built-in HTTP transport is intentionally thin and does not add TLS, ingress auth, rate limiting, CORS, metrics, or admin endpoints
- session approvals are process-local unless a durable policy store is configured
- the only built-in durable policy store is file-backed JSON or YAML
- packs are loaded from source-controlled files at startup; there is no control plane, admin UI, or hot reload service
- approval UX, operator dashboards, and rollback execution stay outside the authority boundary

## Recommended shape

Use Locale in runtime mode behind your existing enterprise edge:

1. embed `createAuthority(config)` in an internal Node service
2. expose `createHttpHandler()` through your existing HTTP stack or gateway
3. terminate TLS, authenticate callers, and enforce network policy outside Locale
4. keep packs under source control and deploy them with the service
5. use the host's existing approval UX before calling `policy.evolve`

The reference CLI remains useful for local compatibility work:

```bash
npx capability-policy-authority serve-http 8080
```

For enterprise runtime embedding, start from:

- [examples/enterprise-http-service.mjs](../examples/enterprise-http-service.mjs)
- [docs/deploy-cloud.md](./deploy-cloud.md)
- [docs/integration-patterns.md](./integration-patterns.md)

## Required runtime inputs

- `CPA_ISSUER`: enterprise issuer string for emitted tokens
- `CPA_SIGNING_KEY_PATH`: JSON file containing `kid`, `publicJwk`, and `privateJwk`
- source-controlled packs loaded from `packs/` or `CPA_PACK_DIR`

Optional runtime inputs:

- `CPA_PUBLISHED_JWKS_PATH`: explicit JWKS document if you do not want it derived from the signing key
- `CPA_TOKEN_TTL_SECONDS`: capability and decision token TTL
- `CPA_SUGGESTION_TTL_SECONDS`: suggestion TTL
- `CPA_POLICY_STORE_PATH`: durable file-backed store for approved policy deltas
- `CPA_EVIDENCE_LEDGER_PATH`: append-only evidence ledger path
- `CPA_PORT` and `CPA_BIND_HOST`: bind settings for the embedded HTTP service

## Dependencies and hosting

Required:

- Node 20+
- existing internal service or gateway to host the authority
- managed signing keys and published verification material
- source-controlled policy pack files
- enterprise ingress controls if the service is reachable over the network

Optional:

- container image for deployment
- durable volume for policy store and evidence ledger files
- federation metadata if external trust exchange matters

Avoid unless you have a concrete requirement:

- dedicated frontend
- separate SaaS control plane
- database or Redis solely for the first rollout
- standalone Locale product hosting

## Frontend guidance

No dedicated frontend is required for enterprise network-wide use.

- if your host already has approval UI, keep using it and call `policy.evolve`
- if your operators need visibility later, add a separate admin surface outside Locale
- do not move execution, secrets, or approval workflow into the authority

## Verification

Before rollout:

1. replay generated transcripts
2. validate the relevant host profile
3. verify capability and decision tokens offline against your production JWKS
4. exercise both local preflight and remote `policy.evaluate`
5. confirm the chosen persistence mode works:
   session-only or file-backed
6. confirm ingress auth, TLS, rate limiting, logging, and tracing are enforced by the surrounding platform
