---
status: resolved
slug: ci-coverage-gate-fail
trigger: "CI verify job fails the jsdom coverage gate; blocks Phase 11 GATE-03 live verification and keeps main CI red."
created: 2026-08-31
updated: 2026-08-31
---

# Debug: CI coverage gate failure (verify job)

## Symptoms

- **Expected:** `npx vitest run --project jsdom --coverage` passes all coverage thresholds; the CI `verify` job goes green.
- **Actual:** `verify` job exits 1 on the coverage gate. Measured coverage is below configured thresholds:
  - Global `lines` 83.84% < 84%
  - Global `functions` 79.04% < 81%
  - `src/components/combobox/**` `functions` 65.67% < 70%
  - `src/components/date-picker/**` `functions` 60.46% < 64%
  - `src/components/select/**` `lines` 82.01% < 83%
  - `src/components/select/**` `functions` 79.36% < 85%
  - `src/components/select/**` `statements` 81.17% < 82%
- **Error (verbatim):**
  - `ERROR: Coverage for lines (83.84%) does not meet global threshold (84%)`
  - `ERROR: Coverage for functions (79.04%) does not meet global threshold (81%)`
  - `ERROR: Coverage for functions (65.67%) does not meet "src/components/combobox/**" threshold (70%)`
  - `ERROR: Coverage for functions (60.46%) does not meet "src/components/date-picker/**" threshold (64%)`
  - `ERROR: Coverage for lines (82.01%) does not meet "src/components/select/**" threshold (83%)`
  - `ERROR: Coverage for functions (79.36%) does not meet "src/components/select/**" threshold (85%)`
  - `ERROR: Coverage for statements (81.17%) does not meet "src/components/select/**" threshold (82%)`
- **Timeline:** Pre-existing on `main`. Main push run 32689360307 ("docs(phase-09): complete phase execution") fails the same `verify` job. Last green push run was 28000199909 ("update dependencies"). Also reproduced on throwaway PR #1 run 33444694629 (verify FAILURE).
- **Reproduction:** Push to a branch / open a PR → CI `verify` job → `Test (jsdom + coverage gate)` step. Locally: `npx vitest run --project jsdom --coverage`.

## Current Focus

hypothesis: |
  CONFIRMED. Coverage regressed because later phases added FUNCTIONS to
  combobox/select/date-picker that the jsdom lane never drives — Phase-8 lazy
  deferral (virtualizer + floating-ui size middleware) plus pre-existing untested
  feature code (searchInTrigger handlers, date keyboard segment digit-input,
  select page-nav, public focus()). The Phase-10 degradation hypothesis is REFUTED
  (that code is jsdom-covered by the batch-a1 specs; src/internal/** is excluded
  from coverage anyway). A secondary local-vs-CI measurement delta (~1pt on select
  ln/st) means CI fails select ln/st even though local passes.
test: "Confirmed via coverage-final.json per-function extraction + reading each uncovered function's source + reading the two batch-a1 degradation specs."
expecting: "N/A — root cause confirmed; now a fix-DIRECTION decision (A add tests vs B re-baseline)."
next_action: "RESOLVED. Human confirmed live-CI green (run 33451875651, PR #2, branch debug/ci-coverage-gate-fail: verify job SUCCESS — coverage gate passes on the real runner; size/surface-diff/verify/smoke/perf all success; only the unrelated browser job failed on a separate Playwright host-deps issue that is out of scope for this session). Session archived to resolved/; knowledge-base entry appended."
bug_class: "Bohrbug — deterministic; coverage gate fails identically on every run (main + PR). No flakiness. SBFL N/A (this is a coverage-ratio shortfall, not a failing test)."
reasoning_checkpoint:
  hypothesis: "The jsdom coverage gate fails because later phases added FUNCTIONS to combobox/date-picker/select that the jsdom lane never drives (searchInTrigger handlers, date segment digit-input, select page-nav, public focus(), lazy virtualizer .then swap). Adding jsdom-reachable tests for those raises real function coverage back over the frozen thresholds; only the genuinely layout-dependent floating-ui size.apply/getters stay uncovered and need a justified per-dir re-baseline."
  confirming_evidence:
    - "coverage-final.json f===0 extraction (in Evidence) names the exact uncovered functions; all but floating-ui size.apply/getters and windowed-only paths are plain interaction/logic reachable by dispatching events or calling methods in jsdom."
    - "Existing PERF-03 tests already drive the 150-option virtual path in jsdom (proves _isVirtual/_handleVirtualKeyDown/_setHighlighted are jsdom-safe), so page-nav + virtualize renderItem/keyFunction are reachable with the lazy-load injection seam."
    - "The lazy-load module exports __setLazyLoadImportersForTest / __resetLazyLoadCachesForTest test seams built exactly for deterministic control of the deferred virtualizer import."
  falsification_test: "If, after adding the tests, combobox/date-picker fn and global fn/ln do NOT clear thresholds with headroom (i.e. the uncovered functions were not actually jsdom-reachable), the hypothesis is wrong and the shortfall is deeper/browser-only than classified."
  fix_rationale: "Adds real tests exercising real behavior (select-mode filtering/selection, date digit entry+clamp, page navigation, windowed row ARIA) — raises genuine coverage, not a threshold relaxation. Root cause = untested reachable code; the fix tests that code. Re-baselining only the floating-ui residual addresses the one genuinely browser-only slice with a naming comment pointing at test/browser/**."
  blind_spots: "Local↔CI ~1pt measurement delta on select ln/st (and ~0.1pt global) — mitigated by targeting >=1.5pt headroom on select ln/st and keeping global fn/ln comfortably over. Fake-virtualize injection renders unwindowed rows (windowing itself stays browser-only) — acceptable since the ARIA-shape oracle is identical either way."
  candidate_causes:
    - "code: reachable feature functions shipped without jsdom tests (combobox/date-picker/select) — primary"
    - "config/environment: v8 coverage measured ~1pt lower in CI than local on select ln/st (runner/timing variance), so a local-only pass still fails CI"
  and_gate: "yes — the select ln/st CI-only failures need BOTH code-drift-near-threshold AND the local↔CI measurement delta to fail; the fn failures are pure code-drift. Remediation must therefore raise real coverage AND leave CI headroom, not just local headroom."

## Evidence

- timestamp: 2026-08-31 — CI run 33444694629 (PR #1) and main run 32689360307 both fail `verify` on the coverage gate with the errors above. Confirms pre-existing, not introduced by the size-baseline test edit.
- timestamp: 2026-08-31 — vitest.config.ts thresholds: global {branches:70, functions:81, lines:84, statements:83}; per-dir combobox {branches:65, functions:70}, date-picker {branches:60, functions:64}, select {branches:66, functions:85, lines:83, statements:82}. Inline comments record measured values that CURRENTLY EXCEED the live CI measurement → regression, not a too-tight threshold set from the start.
- timestamp: 2026-08-31 — REPRODUCED locally at HEAD: `npx vitest run --project jsdom --coverage` (90 files / 750 tests pass). Measured: global ln 83.97 / fn 79.17; combobox fn 65.67; date-picker fn 60.46; select fn 80.95 (ln 83.09 / st 82.09). Same FN gates fail local + CI. NOTE select ln/st PASS locally (83.09/82.09) but FAIL in CI (82.01/81.17) → a local↔CI measurement delta of ~1pt on select, ~0.1pt global. The CI symptom numbers were captured pre-phase-10/11; local is current HEAD.
- timestamp: 2026-08-31 — coverage `include` is `['src/components/**','src/utilities/**']`; `src/internal/**` is EXCLUDED from measurement. So the degradation HELPERS (capabilities.ts, attach-internals-safe.ts, form-participation.ts) do NOT move the numbers — only the component-file call sites do.
- timestamp: 2026-08-31 — Extracted uncovered functions from coverage-final.json (f===0):
    combobox (67 fns, 44 covered, 23 uncovered): _ensureVirtualizer + lazy loadVirtualizer .then/.catch + virtualize renderItem/keyFunction (L883-915); floating-ui size middleware `apply` + reference/floating/middleware getters (L161-217); searchInTrigger handlers _handleDropdownSearch/_handleDropdownSearchKeydown/_toggleSelect/_handleWrapperClick (L943-1013); public focus() (L1016); misc anon.
    date-picker (43 fns, 26 covered, 17 uncovered): keyboard SEGMENT DIGIT-INPUT feature — _handleDigitInput, _advanceToNextSegment, _focusSegment, _clampDay, _getSegmentOrder, _resetBufferTimer (L466-525); floating/validation config anon (L94-115, L417); render anon (L717-740).
    select (63 fns, 51 covered, 12 uncovered): _pageVirtualHighlight (PageUp/Down nav, L1019); public focus() (L1098); deferred floating-ui size middleware `apply` + reference/floating getters (L272-302); lazy virtualize callbacks (L1045-1062); anon L694/743.
- timestamp: 2026-08-31 — The Phase-10 graceful-degradation branches ARE covered under jsdom by test/capabilities-off-constructor.batch-a1.test.ts + test/form-fallback-integration.batch-a1.test.ts (force ElementInternals off, exercise syncFormFallback / warnBelowFloorOnce / teardown / XOR-above-floor). So degradation code is NOT the shortfall driver — the prior hypothesis is refuted.
- timestamp: 2026-08-31 — git history: the denominator growth traces to Phase 8 deferral (8a80904 "defer combobox virtualizer", e0359df "defer select floating-ui size middleware + virtualizer render site", bf99ee4) which wrapped the virtualizer + size-middleware in async/positioning CALLBACKS, plus Phase 4 virtualization (41a847f, 0b29378). These added functions the current synchronous jsdom specs never drive.
- timestamp: 2026-08-31 — FIX APPLIED + VERIFIED. Added 3 jsdom specs (date-picker digit-input, combobox search-in-trigger, select page-nav) covering the reachable set; used the lazy-load __setLazyLoadImportersForTest seam with a fake virtualize directive to make the .then swap + renderItem/keyFunction jsdom-reachable. Result: gate green with REAL exit 0. Measured lifted global fn 79.17->82.58, ln 83.97->87.71; combobox fn 65.67->85.07; date-picker fn 60.46->86.04; select fn 80.95->87.30, ln 83.09->89.56, st 82.09->87.96. No DOWN re-baseline needed; per-dir floors ratcheted UP with CI headroom. tsc --noEmit exit 0; 773/773 tests pass. Implication: root cause (untested reachable feature code) confirmed by the coverage lift; awaiting live-CI confirmation of the verify job going green.

## Classification (jsdom-reachable vs genuinely browser-only) — for the A/B fix checkpoint

- jsdom-REACHABLE (→ option A, add tests, ratchet preserved):
  - combobox: _handleDropdownSearch, _handleDropdownSearchKeydown, _toggleSelect, _handleWrapperClick (searchInTrigger mode); public focus(); _ensureVirtualizer (sync guard + awaited dynamic import .then).
  - date-picker: _handleDigitInput, _advanceToNextSegment, _focusSegment, _clampDay, _getSegmentOrder, _resetBufferTimer (dispatch digit keydowns).
  - select: _pageVirtualHighlight (PageUp/PageDown keydown); public focus().
  These are plain interaction/logic functions reachable by dispatching events, calling methods, or rendering >VIRTUALIZE_ROW_THRESHOLD options.
- jsdom-HARD / effectively browser-only (→ option B candidate, re-baseline with justification):
  - The virtualize() directive's renderItem/keyFunction callbacks and the deferred floating-ui `size` middleware `apply` — depend on real layout (getBoundingClientRect / ResizeObserver) that jsdom stubs to zero, so they may not execute meaningfully even when the code path is entered. These are exactly the paths test/browser/** (Chromium/WebKit/Firefox) is designed to exercise.
- Estimated impact: covering the jsdom-REACHABLE set (≈14 functions across the three dirs) should lift combobox/date-picker/select fn and the global fn/ln back over threshold WITH CI headroom; only a residual layout-dependent gap, if any, would need a justified per-dir re-baseline.

## Eliminated

- hypothesis: "Introduced by the throwaway size-baseline edit (PR #1)" — ELIMINATED: the edit only touches api/size.baseline.json; the verify job runs typecheck/test/coverage and never reads that file, and main fails identically without the edit.
- hypothesis: "The shortfall is driven by Phase 10 graceful-degradation code (attachInternalsSafe / capability probes / hidden-input fallback) being jsdom-unreachable" — ELIMINATED: (1) coverage `include` excludes `src/internal/**`, so the degradation helpers are not even measured; (2) the component-level degradation branches ARE covered under jsdom by the two batch-a1 specs which force ElementInternals off and exercise the fallback/warn/XOR paths. Evidence: coverage-final.json shows the uncovered functions are virtualizer-deferral, floating-ui middleware, searchInTrigger handlers, date segment digit-input, page-nav, and public focus() — not degradation code.
  timestamp: 2026-08-31

## Resolution

root_cause: |
  CONFIRMED (multi-factor, AND-gate fires for the select ln/st sub-failures):
  (1) CODE drift — between the Phase-4 baseline (thresholds ratcheted to then-measured
      jsdom values) and HEAD, later phases ADDED functions to combobox/select/date-picker
      that the jsdom lane never exercises, growing the function denominator ~5pts past the
      frozen fn thresholds. Sources: Phase-8 lazy deferral (_ensureVirtualizer + async
      loadVirtualizer .then/.catch; deferred floating-ui `size` middleware apply/getters)
      and pre-existing untested feature code surfaced by that growth (combobox searchInTrigger
      handlers; date-picker keyboard segment digit-input; select _pageVirtualHighlight; public
      focus() on both). NOT the Phase-10 degradation code (that is jsdom-covered by the batch-a1
      specs). Reproduces identically local + CI.
  (2) CONFIG/ENVIRONMENT contributor — CI measures ~1pt lower than local on select (ln/st) and
      ~0.1pt lower globally, so select ln/st pass locally yet fail in CI. Any remediation must
      leave CI headroom, not just local headroom.
  The fn-coverage failures (combobox/date-picker/select fn + global fn) are pure code-drift; the
  select ln/st CI-only failures are code-drift-near-threshold AND the local↔CI measurement delta.
fix: |
  Applied human decision (mix, A-weighted) — ended up PURE-A (no DOWN re-baseline needed):
  Added 3 jsdom spec files driving the previously-uncovered reachable functions:
    - test/components/date-picker-digit-input.test.ts — keyboard segment digit-input
      (_handleDigitInput year/month/day branches, _clampDay month-shorten clamp,
      _ensureValue backfill, _advanceToNextSegment/_getSegmentOrder/_focusSegment,
      _resetBufferTimer, disabled guard).
    - test/components/combobox-search-in-trigger.test.ts — select-mode wrapper click +
      keyboard (_handleWrapperClick both branches, _toggleSelect + guard,
      _handleDropdownSearch, _handleDropdownSearchKeydown Arrow/Enter/Escape), public
      focus(), and the lazy-virtualizer swap (_ensureVirtualizer + .then AND .catch)
      driven via the lazy-load __setLazyLoadImportersForTest seam with a fake virtualize
      directive that invokes renderItem/keyFunction (so those become jsdom-reachable).
    - test/components/select-page-nav.test.ts — virtualized PageUp/PageDown
      (_pageVirtualHighlight fwd/back/clamp/closed-gate), public focus(), and the
      _renderVirtualOptions .then swap + renderItem/keyFunction + _renderVirtualOption
      via the same fake-virtualize seam.
  vitest.config.ts: RATCHETED UP the per-dir floors to just under the new measured
  coverage (combobox {br 65->78, fn 70->82}; date-picker {br 60->75, fn 64->83};
  select {br 66->72, fn 85, ln 83->86, st 82->85}) with a justifying comment. NO floor
  lowered; global thresholds untouched. Buffers leave CI headroom (select ln/st floors
  sit ~2.5pt+ under local measured to absorb the documented ~1pt local->CI delta).
  The only still-uncovered slice is the genuinely browser-only deferred floating-ui
  `size` middleware apply + reference/floating getters (real layout) and the real
  windowed scroll path — both covered by test/browser/**.
verification: |
  Fix-acceptance guardrail (all applicable signals pass):
  - Coverage gate `npx vitest run --project jsdom --coverage`: REAL exit 0, no ERROR lines.
    Final measured vs threshold (local HEAD, 93 files / 773 tests all pass):
      global   fn 82.58 (>=81, +1.58) | ln 87.71 (>=84, +3.71) | st 87.02 (>=83) | br 75.91 (>=70)
      combobox fn 85.07 (>=82) | br 83.13 (>=78) | ln 91.38 | st 88.81
      date-pkr fn 86.04 (>=83) | br 80.74 (>=75) | ln 84.36 | st 84.61
      select   fn 87.30 (>=85, +2.30) | ln 89.56 (>=86, +3.56) | st 87.96 (>=85, +2.96) | br 76.62 (>=72)
    (was: global fn 79.17/ln 83.97; combobox fn 65.67; date-picker fn 60.46; select fn 80.95 — all failing.)
  - Typecheck `npx tsc --noEmit`: exit 0 (CI verify step 1 — new TS specs + config clean).
  - Existing suite: 773/773 pass — no regression from the added specs or ratchet.
  - Revert check: without the new specs, measured coverage falls below even the ORIGINAL
    floors -> gate red again, confirming the added tests are what close the shortfall.
  - build: unaffected — edits touch only test/** + vitest.config.ts (not build inputs);
    the tsc portion of `npm run build` is covered by the passing tsc --noEmit.
  guardrail_verdict: accepted
  LIVE-CI CONFIRMED (human-verify closed): run 33451875651 on PR #2 (branch
  debug/ci-coverage-gate-fail) — the `verify` job is SUCCESS, so the coverage gate passes
  on the real runner and the local->CI measurement delta is absorbed by the CI-headroom
  buffers. Per-job: size success, surface-diff success, verify success, smoke success,
  perf success; browser FAILURE only, from an unrelated Playwright host-deps issue that is
  OUT OF SCOPE for this session. Overall run conclusion is failure solely due to the
  browser job — the coverage-gate root cause is resolved and Phase 11 GATE-03 is unblocked.
files_changed:
  - test/components/date-picker-digit-input.test.ts (new)
  - test/components/combobox-search-in-trigger.test.ts (new)
  - test/components/select-page-nav.test.ts (new)
  - vitest.config.ts (per-dir coverage floors ratcheted up + justifying comment)

## Fix-strategy note (for the fix checkpoint)

Two legitimate remediations — a user/architectural call at the fix checkpoint, NOT
auto-decided:
  (A) Add jsdom-reachable tests to lift real coverage back over the thresholds
      (preferred by repo discipline: thresholds ratchet UP, never silently down).
  (B) Re-baseline the affected thresholds DOWN with a justifying comment, IF the
      uncovered code is genuinely jsdom-unreachable degradation logic (capability
      probes / sub-Safari-16.4 fallback) that the real-browser lane, not jsdom,
      is meant to exercise.
Most likely a mix: cover what jsdom can reach, re-baseline only the truly
browser-only paths.
