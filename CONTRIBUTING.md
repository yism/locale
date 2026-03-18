# Contributing

## Principle

This repository is hardening-first and chronology-first.

Every compatible change should preserve the evaluate-only product boundary and update the truth artifacts together.

## Required mindset

- do not widen the public contract casually
- do not invent behavior in docs that is not reflected in code and tests
- do not change token claims, reason-code semantics, taxonomy, pack precedence, or MCP tool shapes without explicit human review

## Required artifacts for compatible changes

If a compatible public-facing change lands, it must update all affected artifacts together:

- code
- tests
- fixtures
- transcripts
- chronology
- changelog
- adoption-facing docs when behavior changed

## Change classification

Every contribution should classify itself as one of:

- `no change`
- `compatible change`
- `blocking change`
- `future watch`

## Verification

Run:

```bash
npm run fixtures:refresh
npm test
```

If chronology or changelog drift appears, fix that before asking for review.

## What not to contribute here

- execution engines
- secret brokerage
- workflow orchestration
- payment handling
- generalized agent platform features
