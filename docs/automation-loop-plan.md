# Automation Loop Plan

## Purpose

The product should evolve with minimal supervision, but the core primitive must stay stable. That means the automations should improve:

- protocol coverage
- policy packs
- adoption ergonomics
- conformance quality

They should not autonomously widen the product boundary.

## Operating Assumption

These loops are intended for GPT-5.1 Codex Mini at medium reasoning. That means:

- each automation must have a narrow objective
- prompts must avoid open-ended architecture wandering
- every loop must default back to the current timeline when it finds only weak evidence
- protocol drift or product-boundary changes must stop and ask for human review

## Handshake for Autonomous Work

Each automation should follow the same internal contract.

1. Start from the current spec and changelog.
2. Search for primary-source protocol updates only.
3. Compare those updates against explicit invariants.
4. If there is no strong conflict, prepare a narrow patch or report.
5. If there is a strong conflict in protocol semantics or product boundary, stop and escalate.
6. If the lead appears weak or speculative, discard it and continue from the existing plan.

This is the self-resolution rule: weak leads die automatically.

## Proposed Automations

### Hardening Sweep

Goal:

- keep the verification spine green as code, transcripts, packs, and host profiles evolve

Output:

- one of `no change`, `compatible change`, `blocking change`, or `future watch`

Escalate only when:

- keeping the suite green would require changing token claims, reason-code semantics, action taxonomy, pack precedence, or MCP wire shapes

### Protocol Watch

Goal:

- watch MCP, ACP, UCP, and ATXP primary docs for changes that affect the v0.1 handshake

Output:

- a short report with `no change`, `compatible change`, or `breaking change`

Escalate only when:

- MCP auth semantics change
- new protocol requirements invalidate offline verification
- a protocol introduces a materially better standard for capability issuance

### Spec Tightener

Goal:

- scan the docs for ambiguity, missing invariants, and unstable terminology

Output:

- a patch that tightens wording or a short ambiguity report

Escalate only when:

- resolving the ambiguity would widen product scope
- the patch would introduce a new core object

### Conformance Planner

Goal:

- derive executable conformance scenarios from the spec without yet building the full implementation

Output:

- candidate test cases, fixtures, and failure modes

Escalate only when:

- the spec lacks enough precision to define pass and fail behavior

### Adoption Mapper

Goal:

- look at Codex, IDEs, agent hosts, and MCP tooling to identify the smallest integration path

Output:

- a report showing where friction remains and whether the protocol surface can be reduced

Escalate only when:

- a target host would require us to become an execution broker or secret manager

### Literature Radar

Goal:

- review fresh preprints for concrete impacts on delegation, attestation, tool-use governance, or multi-agent threat models

Output:

- one of `no contract impact`, `threat-model impact`, `evaluation-model impact`, or `future-watch`

Escalate only when:

- a preprint exposes a concrete flaw in the current public contract
- a paper presents a materially better delegation or verification primitive that would improve host adoption

### Threat Model Watch

Goal:

- review protocol misuse cases, agent attack patterns, and host integration failures for issues that require reason-code, pack, or conformance updates

Output:

- a narrow patch or a blocking report

Escalate only when:

- the fix would change token claims, public MCP shapes, or pack precedence

### Docs and Changelog Sync

Goal:

- keep public-facing docs and changelog artifacts aligned with chronology, fixtures, transcripts, and tests

Output:

- a narrow doc or changelog patch, or a blocking report

Escalate only when:

- the docs would need to invent behavior not reflected in code, tests, fixtures, transcripts, or chronology

### Discoverability Sync

Goal:

- keep the outward-facing entry surface aligned with current truth artifacts so cold visitors see the correct product immediately

Output:

- a narrow patch for `README.md`, `docs/index.md`, architecture docs, use-case pages, comparison pages, or a blocking report

Escalate only when:

- discoverability assets would need to claim behavior not present in code, tests, transcripts, host profiles, or chronology

### Chronology Guard

Goal:

- ensure chronology, changelog, fixtures, transcripts, tests, and adoption docs change together

Output:

- a compatibility patch or a blocking report

Escalate only when:

- restoring alignment would require a protocol-version bump or public contract change

### Architecture Drift Watch

Goal:

- compare the architecture explainer against the current MCP tool surface, transcripts, host profiles, chronology, and verification workflow

Output:

- a bounded architecture-doc patch or a blocking report

Escalate only when:

- restoring alignment would require changing public MCP tool names, request or response shapes, or the product boundary

### Near-Miss Interpreter

Goal:

- interpret rare failures and near-failures to capture the smallest durable new hardening artifact

Output:

- a root-cause note classified as `no change`, `compatible change`, `blocking change`, or `future watch`, plus the smallest proposed test or doc addition

Escalate only when:

- the interpretation suggests a public contract change instead of a bounded hardening patch

## Automation Prompts

These are intentionally terse so low-reasoning agents do not drift.

### Prompt: Protocol Watch

Review the current docs in `/Users/mchap/Projects/Locale/docs/`. Check primary-source MCP, ACP, UCP, and ATXP documentation for changes that affect capability issuance, policy evaluation, offline verification, or signing. If you find no strong evidence of a required spec change, produce a concise `no change` report and stop. If you find a compatible clarification, draft the smallest doc patch. If you find a protocol change that would alter the product boundary or invalidate an invariant, do not patch; produce a blocking report for human review.

### Prompt: Hardening Sweep

Read `/Users/mchap/Projects/Locale/docs/verification-workflow.md`, `/Users/mchap/Projects/Locale/docs/change-pipeline.md`, and `/Users/mchap/Projects/Locale/docs/automation-loop-plan.md`. Refresh generated artifacts only if needed, run the current hardening suite, inspect any failures, and classify the result as `no change`, `compatible change`, `blocking change`, or `future watch`. Only make bounded compatible patches that keep the evaluate-only product boundary intact. If keeping the suite green would require changing token claims, reason-code semantics, action taxonomy, pack precedence, or MCP request or response shapes, stop and produce a blocking report.

### Prompt: Spec Tightener

Review the current docs in `/Users/mchap/Projects/Locale/docs/` for ambiguity, inconsistent terms, duplicate concepts, or statements that could not be tested. Tighten wording without widening scope. If a fix would require adding a new core object, changing the product boundary, or introducing execution, stop and write a blocking note instead.

### Prompt: Conformance Planner

Read the current spec in `/Users/mchap/Projects/Locale/docs/`. Produce or update a conformance plan that covers token issuance, offline verification, policy pack composition, baseline safety outcomes, reason-code stability, and deterministic evaluation. Prefer narrow test cases over broad essays. If the spec is too ambiguous to test, stop and identify the smallest missing decision.

### Prompt: Adoption Mapper

Inspect the current spec and local reference repos under `/Users/mchap/Projects/Locale/tmp/agent-protocol-repos/`. Identify the smallest viable integration path for MCP-native orchestrators and IDE-hosted agents. Recommend reductions in protocol surface where possible. If adoption would require this product to execute tools, manage secrets, or expand beyond evaluation and attestation, stop and flag that as a rejection of the current path.

### Prompt: Literature Radar

Review the current docs in `/Users/mchap/Projects/Locale/docs/` and scan fresh preprints for work on capability delegation, tool-use governance, attestation, multi-agent permissions, and agent security. Classify each relevant finding as `no contract impact`, `threat-model impact`, `evaluation-model impact`, or `future-watch`. Do not patch the public contract unless a finding exposes a concrete flaw, a materially better verification primitive, or a clear host-adoption blocker.

### Prompt: Threat Model Watch

Review the current docs, conformance cases, and public protocol material for new attack patterns, confused-deputy risks, token misuse cases, or host-integration failures that affect evaluate-only capability authorities. Draft the smallest patch that adds reason codes, pack rules, or conformance cases. If the fix would change token claims, public MCP tool shapes, or pack precedence, stop and write a blocking note for human review.

### Prompt: Docs and Changelog Sync

Read the current implementation-facing docs and public docs in `/Users/mchap/Projects/Locale/docs/`. Ensure `README.md`, quickstarts, deployment docs, integration docs, and `docs/changelog.md` match the code, tests, fixtures, transcripts, host profiles, and chronology. Patch only when the change is supported by those artifacts. If the docs would need to invent behavior not present in code or generated artifacts, stop and report the mismatch.

### Prompt: Discoverability Sync

Read `README.md`, `docs/index.md`, `docs/architecture.md`, `docs/use-cases-mcp-builders.md`, `docs/compare-and-decide.md`, and `docs/integration-fast-path.md`. Ensure those files stay aligned with code, tests, transcripts, host profiles, and chronology. Patch only supported wording, links, or examples. If keeping discoverability assets accurate would require inventing behavior or widening the product boundary, stop and produce a blocking report.

### Prompt: Chronology Guard

Inspect `/Users/mchap/Projects/Locale/docs/chronology/`, `/Users/mchap/Projects/Locale/docs/fixtures/`, `/Users/mchap/Projects/Locale/docs/transcripts/`, `/Users/mchap/Projects/Locale/docs/host-profiles/`, `/Users/mchap/Projects/Locale/tests/`, and the current public docs. Verify that compatible changes are reflected across chronology, changelog, fixtures, transcripts, tests, and adoption docs together. If one changed without the others, create the smallest compatible patch to restore alignment. If restoring alignment requires a protocol-version bump or public contract change, stop and produce a blocking report.

### Prompt: Architecture Drift Watch

Read `docs/architecture.md`, `docs/architecture.mmd`, `docs/verification-workflow.md`, the current transcripts, host profiles, and chronology manifest. Verify that the explainer mentions only the current three MCP tools and current truth artifacts. Patch only when the docs drift from those sources. If fixing drift would require a public contract change, stop and escalate.

### Prompt: Near-Miss Interpreter

Review recent failures, chronology changes, transcript diffs, host-profile anomalies, and edge cases in `/Users/mchap/Projects/Locale/`. Explain the root cause of each near-miss or miss, classify it as `no change`, `compatible change`, `blocking change`, or `future watch`, and propose the smallest durable test, fixture, transcript, host-profile, or doc change. If the issue implies a public contract change, stop and escalate instead of patching.

## Human-In-The-Loop Triggers

The automation must stop and ask for review when:

- protocol semantics break an invariant
- a proposed change widens the product boundary
- a new standard materially obsoletes the current token or signing format
- a fix requires storing raw user data, secrets, or provider credentials
- evidence is ambiguous but would alter the public contract

## Initial Execution Order

1. run `Protocol Watch`
2. run `Hardening Sweep`
3. run `Chronology Guard`
4. run `Spec Tightener`
5. run `Conformance Planner`
6. run `Adoption Mapper`
7. run `Docs and Changelog Sync`
8. run `Discoverability Sync`
9. run `Architecture Drift Watch`
10. run `Literature Radar`
11. run `Threat Model Watch`
12. run `Near-Miss Interpreter`

The sequence matters. It keeps protocol reality ahead of hardening, hardening ahead of local cleanup, local cleanup ahead of outward-facing discoverability, and discoverability ahead of speculative research pressure.
