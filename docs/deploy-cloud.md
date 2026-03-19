# Cloud Deployment

## Goal

Deploy the same agent policy layer in a containerized environment while keeping reference and runtime behavior distinct.

This page is for teams searching for cloud deployment guidance for MCP policy enforcement, offline verification, and agent action control.

## Reference HTTP mode

Run the packaged reference server in HTTP mode:

```bash
npx capability-policy-authority serve-http 8080
```

Endpoints:

- `POST /mcp`
- `GET /health`

This is useful for local compatibility checks, transcript replay, and containerized demos. It is not the recommended enterprise runtime path.

## Docker quickstart

Build the image:

```bash
docker build -t capability-policy-authority .
```

Run the container:

```bash
docker run --rm -p 8080:8080 capability-policy-authority
```

Health check:

```bash
curl http://127.0.0.1:8080/health
```

## Common platform deployment

For a container-based cloud runtime:

- expose port `8080`
- route `POST /mcp` to the server
- route `GET /health` to health checks
- do not add provider credentials; this layer remains evaluate-only

## Runtime deployment guidance

For enterprise deployment, prefer embedding `createAuthority(config)` and `createHttpHandler()` in your own service bootstrap so you can supply:

- managed signing keys
- explicit issuer identity
- explicit clock source
- source-controlled pack store
- explicit token TTL and protocol version

The repo includes a production-oriented bootstrap example at [examples/enterprise-http-service.mjs](../examples/enterprise-http-service.mjs).

## Enterprise edge responsibilities

Keep these concerns outside Locale and in your existing platform or gateway:

- TLS termination
- service-to-service auth or mTLS
- rate limiting
- logging, metrics, and tracing
- ingress and network policy
- approval UI

## Enterprise operating model

- keep policy packs under source control
- run chronology and transcript refresh as part of CI
- use host profiles to validate named client compatibility before rollout
- treat contract-shape changes as human-gated releases

## Same local and cloud contract

The following must remain identical across local and cloud:

- MCP tools
- policy packs
- fixtures
- transcripts
- chronology
- verification workflow

The difference in v0.3 is the constructor boundary, not the MCP wire contract.
