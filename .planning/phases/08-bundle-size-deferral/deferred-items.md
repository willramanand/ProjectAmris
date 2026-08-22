# Phase 08 — Deferred / Out-of-Scope Items

## Pre-existing, environment-driven test failure (NOT a regression)

- **Test:** `test/perf/_spike.lit-markers.test.ts` > "each confirmed marker appears verbatim in a deliberately-bundled Lit source blob"
- **Discovered during:** 08-01 full-suite regression check
- **Symptom:** `missing Lit source fixture: node_modules/@lit/reactive-element/reactive-element.js: expected false to be true`
- **Root cause:** The test `readFileSync`s Lit's OWN source from a hardcoded relative `node_modules/@lit/...` path. In a parallel-executor git worktree the local `node_modules` is empty (packages resolve from the parent repo `C:/repos/ProjectAmris/node_modules`), so the raw path does not exist here. The parent repo DOES have the file. Unrelated to the floating-ui deferral — the test touches no file changed by 08-01.
- **Scope:** Out of scope (pre-existing + environmental + a `_spike.` throwaway). Do NOT fix in 08-01.
- **Suggested follow-up (not this phase):** make the spike resolve the Lit source via `require.resolve('@lit/reactive-element/reactive-element.js')` instead of a cwd-relative `node_modules/...` path so it is worktree-robust; or exclude `_spike.*` from the CI jsdom lane.

## Pre-existing jsdom virtualizer `scrollIntoView` error (NOT a regression, out of scope)

- **Test:** `test/components/select.test.ts` > "ArrowUp on open wraps to the last option (preserves element-based wraparound)" (and other virtual keyboard-nav cases)
- **Discovered during:** 08-05 Task 1 verification (`npx vitest run test/components/select.test.ts` — 37/37 pass, but with 1 reported unhandled error)
- **Symptom:** `TypeError: Cannot set properties of null (setting 'pin')` thrown from `@lit-labs/virtualizer` `Virtualizer._scrollElementIntoView` (Virtualizer.js:586), reached via `scrollVirtualizerToIndex` → `AmSelect._setHighlighted` on virtual keyboard nav.
- **Root cause:** The REAL `@lit-labs/virtualizer` has no functional scroll container/layout under jsdom (jsdom mocks `ResizeObserver` and lacks layout), so `element(idx).scrollIntoView()` dereferences a null internal `_scrollController.pin` target. Purely a jsdom-environment limitation of the virtualizer; the browser lane (real Chromium) exercises the same path cleanly (see `virtualize-smoke.test.ts`, green). The 08-05 deferral changed only *when* the virtualizer module loads (dynamic `import()` instead of static), not the `scrollVirtualizerToIndex` call path — the identical call existed on the static-import base, so this error is pre-existing, not introduced by 08-05. The suite still passes (37/37); the error is an unhandled async throw, not an assertion failure.
- **Scope:** Out of scope (pre-existing + environmental). Do NOT fix in 08-05.
- **Suggested follow-up (not this phase):** guard `scrollVirtualizerToIndex` against jsdom (e.g. skip when `element(idx)` has no offset parent / no layout), or move the affected select keyboard-nav assertions to the browser lane.
