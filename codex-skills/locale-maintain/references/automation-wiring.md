# Automation Wiring

Use `locale-maintain` as the default skill for Locale recurring work.

## Bounded patching loops

These may make small compatible patches when they stay inside the current boundary:

- Hardening Sweep
- Docs and Changelog Sync
- Discoverability Sync
- Chronology Guard
- Architecture Drift Watch
- existing maintenance loops such as Spec Tightener, Host Profile Watch, and Near-Miss Interpreter

## Report-first loops

These should stop with a blocking note instead of widening the contract:

- Protocol Watch
- Threat Model Watch
- Literature Radar
- Adoption Mapper
- Conformance Planner

## Supporting automation skills

- `gh-fix-ci` for scheduled CI triage summaries without auto-fixing
- `gh-address-comments` for review hygiene or on-demand follow-up
- `playwright` only if Locale later gets a browser-visible demo or UI harness

Do not automate `yeet`, `figma`, `figma-implement-design`, `openai-docs`, or `skill-creator` for Locale maintenance loops.
