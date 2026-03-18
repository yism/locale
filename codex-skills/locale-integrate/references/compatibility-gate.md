# Minimum Compatibility Gate

Do not call an integration complete until these checks pass:

1. Replay or inspect the generated transcripts.
2. Validate at least one named host profile expectation.
3. Verify emitted capability and decision tokens offline against published keys.
4. Confirm local preflight handles covered `read` or `network` actions without a remote call.
5. Confirm approval-gated or uncovered actions go through `policy.evaluate`.

## Helpful repo truth, when available

- `docs/transcripts/`
- `docs/host-profiles/`
- `docs/fixtures/`
- `examples/orchestrator-flow.mjs`

## Bundled helper

If a Locale checkout is available, run:

```bash
node codex-skills/locale-integrate/scripts/run_minimum_compatibility_check.mjs --locale-root /path/to/locale
```

Add `--run-tests` to execute `tests/compatibility.test.mjs` in that checkout.
