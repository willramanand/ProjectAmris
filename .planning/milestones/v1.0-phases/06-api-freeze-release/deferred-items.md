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
  status: acknowledged

## 06-02

- **`npm run size` RED on the base commit (pre-existing, out of scope).** The
  bundle-size / tree-shaking canary already fails on this worktree's base
  (3274a9a) with ZERO edits: core bundle 25.07 kB / 23 kB limit, full bundle
  68.16 kB / 55 kB, data-grid deep import 11.99 kB / 3.5 kB. Verified by
  stashing all 06-02 edits, rebuilding, and re-running `npm run size` — the
  overage is identical. Plan 06-02's `sideEffects` and `vite.config` changes are
  size-neutral (the exact same numbers appear with and without the edits, and
  `dist/tokens/index.js` is correctly reported side-effect-free / tree-shakeable
  by esbuild). This is NOT caused by 06-02, whose declared scope is
  package.json + smoke + CI. The `size` CI job (Node 22) will keep failing until
  the budgets in `.size-limit.json` are re-baselined or the bundles are shrunk —
  both are user decisions (re-baselining weakens the canary's guarantee; shrinking
  touches component source). Logged to WINDOWS.md (kind: unmet-truth). Recommend a
  follow-up to reconcile `.size-limit.json` with reality before the 1.0 publish.

- **Deep-export resolution fixed via `vite.config.ts` (deviation from declared
  scope).** Task 1's action instructed to "add or correct" any `exports` entry
  pointing at a non-existent target. Audit found `./tokens`, `./utilities/*`, and
  `./styles/*` (beyond `tokens.css`) resolved to `.js` files the build never
  emitted (only `.d.ts` existed) — a consumer `import` would hit
  `ERR_MODULE_NOT_FOUND`. Correcting this required emitting those deep entries,
  which lives in `vite.config.ts` (not in the plan's declared `files_modified`).
  Applied the minimal, size-neutral fix (discover `src/utilities/*` and
  `src/styles/*` as lib entries + explicit `tokens/index`). Documented in the
  SUMMARY as a deviation; not deferred (fixed here) — noted for scope visibility.
  status: acknowledged
