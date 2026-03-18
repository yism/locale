# Codex Skills

This repo now carries the canonical Codex skill and automation definitions for Locale.

## Skills

- `codex-skills/locale-integrate/`
  public adoption skill for integrating `capability-policy-authority` into Node MCP hosts, IDEs, orchestrators, or services
- `codex-skills/locale-maintain/`
  repo-maintenance skill for working on Locale without widening the evaluate-only boundary

Each skill includes:

- `SKILL.md`
- `agents/openai.yaml`
- `references/`
- optional `scripts/`

## Automations

Canonical Locale automation TOMLs live under `codex-automations/`.

The prompts explicitly invoke:

- `[$locale-maintain](/Users/mchap/Projects/Locale/codex-skills/locale-maintain/SKILL.md)` for default Locale maintenance guardrails
- `[$gh-fix-ci](/Users/mchap/.codex/skills/gh-fix-ci/SKILL.md)` only for CI triage
- `[$gh-address-comments](/Users/mchap/.codex/skills/gh-address-comments/SKILL.md)` only for review hygiene

## Sync to Codex

Sync the repo-owned skills and automations into the local Codex home:

```bash
node scripts/sync-codex-assets.mjs
```

The script copies:

- `codex-skills/*` to `~/.codex/skills/`
- `codex-automations/*` to `~/.codex/automations/`

It overwrites matching files but does not delete unrelated local entries.

## Design constraints

- `locale-integrate` is public-facing and optimized for uptake as a dependency.
- `locale-maintain` is repo-aware and enforces chronology, fixture, transcript, and test alignment.
- Skills are procedural knowledge only; if Codex must use Locale live, register Locale itself as an MCP server or CLI dependency in addition to invoking a skill.
