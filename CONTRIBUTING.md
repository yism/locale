# Contributing

Thanks for contributing to Locale. This repository is open to outside contributions, but it is intentionally disciplined about contract drift and product-boundary creep.

## Quick start

Install dependencies and run the baseline verification flow:

```bash
npm run fixtures:refresh
npm test
```

If you are changing public-facing behavior, review the current truth sources before sending a patch:

- `README.md`
- `docs/architecture.md`
- `docs/verification-workflow.md`
- `docs/changelog.md`
- `docs/chronology/`
- `docs/transcripts/`
- `docs/host-profiles/`

## Principle

This repository is hardening-first and chronology-first.

Every compatible change should preserve the agent policy boundary and update the truth artifacts together.

## Required mindset

- do not widen the public contract casually
- do not invent behavior in docs that is not reflected in code and tests
- do not change token claims, reason-code semantics, taxonomy, pack precedence, or MCP tool shapes without explicit human review

## Contribution flow

1. Open an issue first for significant behavior changes, public contract adjustments, or positioning changes that would alter adoption-facing docs.
2. Send direct pull requests for focused fixes, documentation improvements, tests, and bounded implementation work inside the current boundary.
3. Use the issue templates and PR template so chronology, changelog, transcripts, and tests stay aligned.

## Review expectations

- every change should classify itself as `no change`, `compatible change`, `blocking change`, or `future watch`
- reviewers will check whether docs, tests, fixtures, transcripts, chronology, and changelog still agree
- changes that broaden the product into orchestration, execution, secrets, or payments should be rejected rather than merged behind flags

## Discuss first

Open an issue before implementation if your change would:

- alter MCP tool names or request/response shapes
- change token claims or reason-code semantics
- change action taxonomy or pack precedence
- require repositioning the product beyond an agent policy layer
- add a new integration surface that acts like orchestration or execution rather than evaluation and attestation

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

## Public launch files

Public contributors should also respect:

- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)
- [SUPPORT.md](./SUPPORT.md)
- [LICENSE](./LICENSE)
- [NOTICE](./NOTICE)

## What not to contribute here

- execution engines
- secret brokerage
- workflow orchestration
- payment handling
- generalized agent platform features
