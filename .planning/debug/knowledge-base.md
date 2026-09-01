---
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-01
  status: unknown
---

# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## ci-coverage-gate-fail — CI verify job fails the jsdom coverage gate (function-coverage drift + local↔CI measurement delta)

- **Date:** 2026-08-31
- **Error patterns:** coverage does not meet global threshold, coverage does not meet "src/components/..." threshold, jsdom coverage gate, functions coverage below threshold, lines/statements below threshold, vitest --project jsdom --coverage, verify job exit 1, v8 coverage, combobox, select, date-picker, coverage regression, local passes CI fails
- **Root cause(s):** CODE drift — later phases (Phase-8 lazy deferral of the combobox/select virtualizer + deferred floating-ui `size` middleware; Phase-4 virtualization) added FUNCTIONS to combobox/select/date-picker that the synchronous jsdom lane never drives, plus pre-existing untested feature code surfaced by that growth (combobox searchInTrigger handlers, date-picker keyboard segment digit-input, select `_pageVirtualHighlight` page-nav, public `focus()`), growing the function denominator ~5pts past the Phase-4-frozen thresholds (reproduces identically local + CI); AND CONFIG/ENVIRONMENT contributor — v8 measures ~1pt lower in CI than local on select ln/st (and ~0.1pt globally), so select ln/st passed locally yet failed in CI. AND-gate fires for the select ln/st sub-failures (needs both code-drift-near-threshold AND the measurement delta); the fn failures are pure code-drift. NOT the Phase-10 graceful-degradation code (jsdom-covered by the batch-a1 specs; `src/internal/**` is excluded from coverage anyway).
- **Fix:** Pure-A (raise real coverage, no floor lowered). Added 3 jsdom spec files driving the previously-uncovered reachable functions — `test/components/date-picker-digit-input.test.ts` (keyboard segment digit-input + clamp/backfill), `test/components/combobox-search-in-trigger.test.ts` (select-mode wrapper click/keyboard + public focus() + lazy-virtualizer .then/.catch swap via the `__setLazyLoadImportersForTest` seam with a fake virtualize directive that invokes renderItem/keyFunction), `test/components/select-page-nav.test.ts` (virtualized PageUp/PageDown + public focus() + virtual-row swap). Ratcheted the vitest.config.ts per-dir floors UP to just under the new measured coverage with a justifying comment (combobox {br 65→78, fn 70→82}; date-picker {br 60→75, fn 64→83}; select {br 66→72, fn 85, ln 83→86, st 82→85}); global thresholds untouched; floors sit ~2.5pt+ under local measured to absorb the documented ~1pt local→CI delta. Live-CI confirmed: run 33451875651 (PR #2), `verify` job SUCCESS (only the unrelated Playwright browser job failed).
- **Files changed:** test/components/date-picker-digit-input.test.ts (new), test/components/combobox-search-in-trigger.test.ts (new), test/components/select-page-nav.test.ts (new), vitest.config.ts (per-dir coverage floors ratcheted up + justifying comment)
- **Why not caught:** The coverage gate itself is the gate, but it lives only in the CI `verify` job — which was already red on `main` and being pushed past, so its signal was masked. No incremental per-PR coverage check flagged the drift as Phase-4/8/10 progressively added jsdom-unreachable functions; the absolute gate only fired once accumulated drift crossed the frozen thresholds. Additionally, no gate accounted for the local↔CI v8 measurement delta, so "passes locally" gave false confidence for the select ln/st slice.
- **Recurrence guard:** Regression tests `test/components/{date-picker-digit-input,combobox-search-in-trigger,select-page-nav}.test.ts` (committed in e3ffded) now drive the previously-uncovered reachable functions, so a future coverage drop in these paths re-fails the gate; the vitest.config.ts per-dir floors were ratcheted UP (never down) with a justifying comment and deliberate CI-headroom buffers (select ln/st floors ~2.5pt+ under local measured) so the local↔CI delta no longer produces CI-only false-fails; and this KB entry itself is the Phase-0 pattern — a future "coverage gate below threshold / passes local fails CI" symptom should first check for jsdom-unreachable feature functions added by later phases (virtualizer/floating-ui deferral, keyboard/interaction handlers, public methods) rather than assuming a too-tight threshold or degradation code.

---
