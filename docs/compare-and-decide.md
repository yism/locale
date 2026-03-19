# Compare and Decide

Use this page when you are comparing agent policy layers, MCP policy enforcement options, or safe tool-use control patterns for hosts and orchestrators.

## Use this when you need

- an agent policy layer for safe tool use
- MCP policy enforcement without downstream execution
- evaluate-only agent preflight
- offline verification and attestation
- capability issuance for orchestrators and MCP hosts
- a natural boundary for A2A or multi-agent delegation
- host-profile, transcript, and chronology-backed integration hardening

## Do not use this when you need

- downstream execution
- secret brokerage
- workflow orchestration
- payment handling
- a general agent platform

## Why that matters

This repo stays adoptable because it remains a narrow dependency layer. The moment it absorbs orchestration, vaulting, or execution, it stops being the thing other systems can safely sit on top of.

Locale is strongest when it is the policy boundary between agent intent and tool execution, not a replacement for the systems around it.
