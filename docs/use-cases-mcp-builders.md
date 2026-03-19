# MCP Builder Use Cases

Locale fits teams that need an agent policy layer for MCP hosts, A2A-style delegation, and orchestrators that want stronger control over tool use without becoming execution platforms themselves.

## IDE preflight gate

An MCP-native host:

1. calls `capabilities.get`
2. verifies the token locally
3. locally preflights covered `read` and `network` actions
4. calls `policy.evaluate` for `deploy`, `write`, `commerce`, `identity`, `secrets`, and `admin`

## Orchestrator boundary layer

A workflow engine:

1. issues one capability token per mission
2. distributes local verification and preflight to sub-agents
3. attaches capability and decision artifacts to logs or receipts

This is the natural fit for A2A and multi-agent systems that need delegation with verifiable boundaries.

## Enterprise policy shim

A platform team:

1. runs the authority locally or in cloud
2. manages declarative packs under source control
3. validates integrations using host profiles, transcripts, chronology, and tests

## Compatibility oracle

A host team:

1. replays golden transcripts
2. validates named host profiles
3. uses chronology and changelog to understand compatible changes over time

## Search intent this page covers

- MCP policy enforcement
- agent policy layer
- safe tool use for AI agents
- A2A and multi-agent governance
- offline verification and attestation for agent actions
