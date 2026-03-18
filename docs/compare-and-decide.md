# Compare and Decide

## Use this when you need

- evaluate-only agent preflight
- offline verification and attestation
- capability issuance for orchestrators and MCP hosts
- host-profile, transcript, and chronology-backed integration hardening

## Do not use this when you need

- downstream execution
- secret brokerage
- workflow orchestration
- payment handling
- a general agent platform

## Why that matters

This repo stays adoptable because it remains a narrow dependency layer. The moment it absorbs orchestration, vaulting, or execution, it stops being the thing other systems can safely sit on top of.
