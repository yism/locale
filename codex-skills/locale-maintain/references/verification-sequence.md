# Verification Sequence

Use this sequence for intentional compatible contract changes:

1. update the implementation
2. run `npm run fixtures:refresh`
3. run `npm test`
4. review the generated files in:
   - `docs/fixtures/`
   - `docs/transcripts/`
   - `docs/chronology/<protocol-version>/manifest.json`

## Regression rule

If the contract did not intentionally change, diffs in those generated directories are regression signals, not routine churn.
