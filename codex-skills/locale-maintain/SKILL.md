---
name: "locale-maintain"
description: "Use when working on the Locale capability-policy-authority repository itself. Preserve the evaluate-only boundary, treat token claims, reason-code semantics, action taxonomy, pack precedence, and MCP request or response shapes as human-review gates, enforce the fixture refresh and test sequence for intentional compatible contract changes, and keep docs, fixtures, transcripts, chronology, and adoption artifacts aligned."
---

# Locale Maintain

Use this skill only inside the Locale repo or a faithful fork.

## Start-up check

Before making changes, confirm the workspace looks like Locale:

- `package.json` name is `capability-policy-authority`
- `docs/verification-workflow.md` exists
- `docs/change-pipeline.md` exists

If those are missing, stop and say the repo does not match this skill.

## Guardrails

Read these first:

- `references/repo-guardrails.md`
- `references/verification-sequence.md`
- `references/automation-wiring.md`

## Human-review gates

Do not autonomously change:

- token claims
- reason-code semantics
- action taxonomy
- pack precedence
- MCP tool names
- MCP request or response shapes

If the requested fix needs one of those, stop and escalate.

## Normal workflow

1. Ground changes in repo truth from the docs, tests, transcripts, fixtures, and chronology.
2. Keep the evaluate-only boundary intact.
3. For intentional compatible contract changes, follow the verification sequence exactly.
4. For docs or automation work, do not claim behavior unsupported by code, tests, fixtures, transcripts, or chronology.
5. Classify automation or review outcomes as `no change`, `compatible change`, `blocking change`, or `future watch`.

## Supporting skills

Use these only as helpers:

- `gh-fix-ci` for GitHub Actions CI triage
- `gh-address-comments` for PR review comment handling

Do not route recurring Locale work through `yeet`, `figma`, `figma-implement-design`, `openai-docs`, or `skill-creator`.
