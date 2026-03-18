# Cloud Deployment

## Goal

Deploy the same evaluate-only MCP surface in a containerized environment while keeping reference and runtime behavior distinct.

## HTTP mode

Run the packaged reference server in HTTP mode:

```bash
npx capability-policy-authority serve-http 8080
```

Endpoints:

- `POST /mcp`
- `GET /health`

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

The difference in v0.2 is the constructor boundary, not the MCP wire contract.
