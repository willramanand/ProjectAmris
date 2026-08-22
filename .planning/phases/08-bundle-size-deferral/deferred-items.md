# Phase 08 — Deferred / Out-of-Scope Items

## Pre-existing, environment-driven test failure (NOT a regression)

- **Test:** `test/perf/_spike.lit-markers.test.ts` > "each confirmed marker appears verbatim in a deliberately-bundled Lit source blob"
- **Discovered during:** 08-01 full-suite regression check
- **Symptom:** `missing Lit source fixture: node_modules/@lit/reactive-element/reactive-element.js: expected false to be true`
- **Root cause:** The test `readFileSync`s Lit's OWN source from a hardcoded relative `node_modules/@lit/...` path. In a parallel-executor git worktree the local `node_modules` is empty (packages resolve from the parent repo `C:/repos/ProjectAmris/node_modules`), so the raw path does not exist here. The parent repo DOES have the file. Unrelated to the floating-ui deferral — the test touches no file changed by 08-01.
- **Scope:** Out of scope (pre-existing + environmental + a `_spike.` throwaway). Do NOT fix in 08-01.
- **Suggested follow-up (not this phase):** make the spike resolve the Lit source via `require.resolve('@lit/reactive-element/reactive-element.js')` instead of a cwd-relative `node_modules/...` path so it is worktree-robust; or exclude `_spike.*` from the CI jsdom lane.
