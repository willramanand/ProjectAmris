---
phase: 10-graceful-degradation-compatibility-matrix
plan: 03
subsystem: ui
tags: [css, supports, has-selector, graceful-degradation, compat, web-components, lit]

requires:
  - phase: 07-measurement-infrastructure
    provides: test/browser/** real-browser lane (Vitest Browser Mode + Playwright Chromium)
provides:
  - All 10 in-repo :has() usages wrapped in @supports selector(:has(*)) with a functional default outside the block (COMPAT-06)
  - test/css-supports-guard.test.ts — source-level guard-shape assertion (GUARDED_FILES array, all 6 files)
  - test/browser/supports-guards.test.ts — Chromium above-floor regression proof (widened to WebKit+Firefox by Plan 07)
  - Empirical finding — :has(::slotted(*)) is invalid; the empty-slot-collapse rules were always inert no-ops
affects: [Plan 07 widened-matrix (adds WebKit/Firefox to supports-guards spec), COMPAT-05 BROWSER_SUPPORT.md degradation matrix]

actuals:
  tokens: 5000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "@supports selector(:has(*)) progressive-enhancement guard — functional default OUTSIDE, modern enhancement INSIDE (first @supports usage in src/)"
    - "Source-level guard-shape assertion via a GUARDED_FILES-driven vitest spec (fs.readFileSync + brace-matched @supports range detection)"

key-files:
  created:
    - test/css-supports-guard.test.ts
    - test/browser/supports-guards.test.ts
  modified:
    - src/components/card/card.ts
    - src/components/panel/panel.ts
    - src/components/dialog/dialog.ts
    - src/components/app-shell/app-shell.ts
    - src/components/drawer/drawer.ts
    - src/components/side-nav/side-nav.ts

key-decisions:
  - "Functional default value matches each region's non-empty display: block for card/panel/app-shell/side-nav; the existing display:flex base rule for dialog/drawer footers (adding display:block there would clobber flex above the floor — landmine 3)."
  - "Did NOT repair the empty-slot-collapse feature. :has(::slotted(*)) is invalid (pseudo-element inside :has), so the collapse rules were always inert; making empty slots actually collapse would be a behavior change (newly hiding empty regions) — out of COMPAT-06's behavior-preserving scope. Guard the usage; leave behavior byte-identical."
  - "Browser regression test asserts the TRUE unchanged above-floor behavior (regions render at their functional default for both empty and non-empty slots), not the plan's idealized display:none collapse (empirically false on all engines)."

patterns-established:
  - "@supports selector(:has(*)) guard idiom with non-empty :has(*) argument (never the empty selector(:has()) form, which Safari reports false)"
  - "GUARDED_FILES single-source-of-truth array so future :has()/container-query guards append one entry + are auto-asserted"

requirements-completed: [COMPAT-06]

coverage:
  - id: D1
    description: "All 10 in-repo :has() rules (6 layout components) wrapped in @supports selector(:has(*)) with a functional default authored outside the block; zero un-guarded :has() usages remain"
    requirement: "COMPAT-06"
    verification:
      - kind: unit
        ref: "test/css-supports-guard.test.ts (32 assertions — guard present, collapse rule nested inside @supports, functional default outside, no empty selector(:has()) gotcha)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Above-floor rendering is byte-identical to pre-change on real Chromium — the guard is a safe no-op; regions render at their functional default (block for card/panel/app-shell/side-nav, flex for dialog/drawer footers) for empty and non-empty slots"
    requirement: "COMPAT-06"
    verification:
      - kind: e2e
        ref: "test/browser/supports-guards.test.ts (7 Chromium tests across am-card, am-panel, am-dialog, am-app-shell, am-drawer, am-side-nav)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zero container-query usages exist in src/components/** (D-05 'guard every usage' has no container-query workload this phase)"
    requirement: "COMPAT-06"
    verification:
      - kind: other
        ref: "grep -rE 'container-type|@container|container:' src/components/ → no matches"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-08-27
status: complete
---

# Phase 10 Plan 03: Graceful Degradation & Compatibility Matrix (COMPAT-06 CSS-feature audit) Summary

**All 10 in-repo `:has()` empty-slot-collapse rules across 6 layout components wrapped in `@supports selector(:has(*))` with a functional default outside the block, backed by a 32-assertion source-shape spec and a 7-test Chromium above-floor regression proof — while uncovering that the collapse rules were always inert (`::slotted` is invalid inside `:has()`).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-08-27T18:44Z
- **Completed:** 2026-08-27T18:52Z
- **Tasks:** 3
- **Files modified:** 8 (6 components + 2 new test files)

## Accomplishments

- Wrapped every one of the 10 `:has()` usages (`.X:not(:has(::slotted(*))) { display: none; }`) in `@supports selector(:has(*))` across card (×2), panel, dialog, app-shell (×3), drawer, side-nav — using the non-empty `:has(*)` argument (never the Safari-false `selector(:has())` form).
- Authored a functional default OUTSIDE each block: explicit `display: block` for card/panel/app-shell/side-nav; the pre-existing `display: flex` base rule serves as the default for dialog/drawer footers (no `block` added there — it would clobber flex above the floor).
- Created `test/css-supports-guard.test.ts` (32 assertions): a `GUARDED_FILES`-driven source spec proving, per selector, that the guard is present, the collapse rule is nested inside the `@supports` block, a functional-default rule exists outside it, and the empty-`:has()` gotcha form is never used.
- Created `test/browser/supports-guards.test.ts` (7 Chromium tests): above-floor regression proof that all 6 components render byte-identically to pre-change.
- Confirmed zero container-query usages remain (grep) and no un-guarded `:has()` usage remains anywhere in `src/`.

## Task Commits

1. **Task 1 (tracer): guard card.ts + seed both test files** - `29694fd` (feat)
2. **Task 2: guard panel/dialog/app-shell (5 rules, 3 files)** - `72cc690` (feat)
3. **Task 3: guard drawer/side-nav — complete the audit** - `5481990` (feat)

## Files Created/Modified

- `src/components/card/card.ts` - `.header`/`.footer` collapse rules guarded; explicit `display:block` defaults.
- `src/components/panel/panel.ts` - `.header` guarded; `display:block` default.
- `src/components/dialog/dialog.ts` - `.footer` guarded; existing `display:flex` is the default (no block added).
- `src/components/app-shell/app-shell.ts` - `.header`/`.sidebar`/`.footer` guarded; `display:block` defaults.
- `src/components/drawer/drawer.ts` - `.footer` guarded; existing `display:flex` default.
- `src/components/side-nav/side-nav.ts` - `.header`/`.footer` guarded; `display:block` defaults.
- `test/css-supports-guard.test.ts` - source-level guard-shape assertion (new).
- `test/browser/supports-guards.test.ts` - Chromium above-floor regression proof (new).

## Decisions Made

- **Functional-default value per region.** The default outside `@supports` must equal what the rule produced when the slot is non-empty (landmine 3). Block for card/panel/app-shell/side-nav; the existing `display:flex` base rule for dialog/drawer footers — no `display:block` added to those (it would change above-floor layout from flex to block).
- **Did not repair the empty-slot-collapse feature.** See Deviations — the rules were always inert; fixing them would be a behavior change, out of this phase's behavior-preserving scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Backtick inside a CSS comment terminated the `css` template literal**
- **Found during:** Task 2 (dialog.ts)
- **Issue:** A dialog.ts comment used backticks (`` `.footer { display: flex }` ``) inside the `css\`...\`` template literal; the backtick prematurely closed the template, producing a `vite:oxc` JS parse error (`, or ] expected`) that broke the whole browser suite import.
- **Fix:** Removed backticks from the comment (plain prose).
- **Files modified:** src/components/dialog/dialog.ts
- **Verification:** Browser suite imports and all 7 tests pass.
- **Committed in:** `72cc690`

### Plan-premise correction (documented, not auto-fixed — out of scope)

**2. Empty-slot-collapse `:has()` rules are inert — the plan's `display:none` expectation is empirically false**
- **Found during:** Task 1 (first browser-lane run — the tracer feedback gate)
- **Finding:** The plan's acceptance criteria and browser test expected empty header/footer slots to collapse to `display:none` above the floor. Empirically, Chromium reports `CSS.supports('selector(:has(::slotted(*)))')` = **false** — `::slotted` is a pseudo-ELEMENT and is invalid inside `:has()` per the Selectors spec, so the entire `.X:not(:has(::slotted(*)))` selector is dropped by every engine. The collapse rule has **always been an inert no-op**; empty slots have always rendered at their natural display, not collapsed.
- **Why not auto-fixed:** Making empty slots actually collapse (e.g. via `:host(:has([slot="header"]))`) would be a **behavior change** — newly hiding empty regions that currently render — which violates the phase's surface-freeze / behavior-preserving mandate (CONTEXT.md). COMPAT-06's mandate is to *guard* the `:has()` usage for clean degradation and prove above-floor behavior *unchanged*, both of which are satisfied. Repairing the collapse feature is a separate, behavior-changing decision for a future phase.
- **Action taken:** (a) Kept the correct `@supports` guard (byte-identical no-op above the floor). (b) Rewrote the browser regression test to assert the TRUE unchanged behavior (regions render at their functional default for empty AND non-empty slots) rather than the false `display:none` collapse. (c) Logged the latent defect to `.planning/WINDOWS.md` (kind: todo) for cross-phase visibility.

---

**Total deviations:** 1 auto-fixed (1 bug) + 1 documented plan-premise correction (out of scope to fix).
**Impact on plan:** The COMPAT-06 guard deliverable is fully met (all 10 usages guarded, proven structurally + behaviorally). The one adjustment was correcting the test's assertion to the empirically-true above-floor behavior; no scope creep.

## Issues Encountered

- Worktree has no local `node_modules`; resolved by relying on Node/npm resolution walking up to the parent repo's `C:/repos/ProjectAmris/node_modules` (the worktree is nested inside the main repo). `npx vitest` resolves and both lanes run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMPAT-06 CSS-feature audit complete. `test/browser/supports-guards.test.ts` is ready for Plan 07 to widen its engine matrix to WebKit + Firefox (per-instance `include` already targets it).
- `BROWSER_SUPPORT.md` (COMPAT-05, later plan) should note that below the `:has()` floor the guarded regions reserve space (functional default) rather than collapsing — and that the collapse itself is currently inert on all engines (see WINDOWS.md).
- No blockers for sibling wave-1 plans (this plan is CSS-only, `depends_on: []`).

## Self-Check: PASSED

- Created files verified on disk: `test/css-supports-guard.test.ts`, `test/browser/supports-guards.test.ts`, `10-03-SUMMARY.md`.
- Task commits verified: `29694fd`, `72cc690`, `5481990`.
- Both verification lanes green: jsdom source-assertion (32/32), Chromium browser regression (7/7). dialog-top-layer browser regression (5/5) unaffected.

---
*Phase: 10-graceful-degradation-compatibility-matrix*
*Completed: 2026-08-27*
