# Deferred Items — Phase 06 API Freeze & Release

Out-of-scope discoveries logged during execution. Not fixed here.

## 06-01

- **Stale `docs/contract.md` (pre-existing, out of scope).** Running `npm run build`
  regenerated `docs/contract.md` with real deltas from the committed copy: `::part()`
  count 76 → 77, a new `am-shortcuts` (default) slot, and new `error` parts on
  `am-checkbox` and `am-color-picker`. The committed contract doc is stale relative to
  current source. This is NOT caused by plan 06-01 (which touches only the release-gate
  script, its test, the CI label, and the smoke script — never `src/` or the contract
  generator). Note the CEM surface baseline itself is in sync: `npm run diff:surface`
  reports "No surface drift". The `Contract doc drift check` CI step will fail until the
  committed `docs/contract.md` is regenerated and committed. Reverted the working-tree
  change here to keep the plan's commit scope clean. Recommend a follow-up (or plan
  06-02/06-03) to regenerate and commit `docs/contract.md`.
