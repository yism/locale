# Repo Guardrails

Locale stays useful by remaining evaluate-only.

## Mandatory human review

Escalate instead of patching when the change would alter:

- token claims
- reason-code semantics
- action taxonomy
- pack precedence
- MCP tool names
- MCP request or response shapes

## Artifact alignment rule

Accepted compatible changes must update all affected truth artifacts together:

- spec docs
- fixtures
- transcripts
- tests
- adoption docs when host behavior changes

If a proposed change cannot be reflected across that set, it does not merge cleanly.
