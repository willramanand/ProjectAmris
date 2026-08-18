---
phase: 03-reliability-leak-fixes
plan: 02
subsystem: ui
tags: [lit, web-components, dialog, teardown, focus, isconnected, leak-fix]

# Dependency graph
requires:
  - phase: 03-reliability-leak-fixes
    provides: TeardownScope shared teardown primitive (src/internal/helpers/teardown-scope.ts, from 03-01)
provides:
  - am-dialog disconnectedCallback drains a TeardownScope so the _nudge animationend listener never dangles (FIX-04)
  - am-dialog _hide() focus restoration guarded by isConnected so a removed opener is never focused and never throws (FIX-03)
affects: [dialog, FIX-03, FIX-04, reliability-leak-fixes]

# Actuals
actuals:
  tokens: 1828
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reused TeardownScope discipline (from 03-01): one scope per component tracks the fire-and-forget nudge animationend listener; disconnectedCallback drains it via clear()."
    - "isConnected guard on focus restoration: focus() is only driven onto _previouslyFocused when it is still an HTMLElement AND connected to the document."

key-files:
  created: []
  modified:
    - src/components/dialog/dialog.ts
    - test/components/dialog.test.ts
    - test/browser/overlay-focus.test.ts

key-decisions:
  - "Reused the src/internal TeardownScope helper (D-09 boundary) rather than reimplementing teardown locally in dialog.ts — same primitive proven by the 03-01 toast tracer."
  - "Matched toast.ts convention: disconnectedCallback declared without the `override` keyword (project does not enable noImplicitOverride)."
  - "Deterministic jsdom teardown assertion via the captured TeardownScope abort signal (jsdom does not auto-fire animationend), avoiding a flaky animation wait."
  - "Flipped the existing browser removed-opener test from an unguarded 'finding' to a guarded FIX-03 assertion rather than adding a parallel test — the finding is now the fix."

patterns-established:
  - "Overlay focus restoration guards the target with isConnected before calling focus() — safe when the opener was removed mid-open."

requirements-completed: [FIX-03, FIX-04]

coverage:
  - id: D1
    description: "am-dialog registers the _nudge animationend listener on a TeardownScope signal and drains it in disconnectedCallback; a dialog disconnected mid-nudge tears down the listener (FIX-04)."
    requirement: FIX-04
    verification:
      - kind: unit
        ref: "test/components/dialog.test.ts#tears down the nudge animationend listener on disconnect (FIX-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-dialog _hide() focus restoration is guarded by isConnected; closing a dialog whose opener was removed does not throw and does not call focus() on the disconnected node (FIX-03)."
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "test/components/dialog.test.ts#does not focus a removed opener on close (FIX-03)"
        status: pass
      - kind: browser
        ref: "test/browser/overlay-focus.test.ts#am-dialog (FIX-03): closing with a removed opener is guarded"
        status: pass
    human_judgment: false
  - id: D3
    description: "No user-visible regression — am-dialog still opens/closes, emits am-open/am-close, restores focus to a still-connected opener, nudges on blocked backdrop click, and traps focus as before."
    verification:
      - kind: unit
        ref: "test/components/dialog.test.ts (14 cases, jsdom project, all pass)"
        status: pass
      - kind: browser
        ref: "test/browser/overlay-focus.test.ts (5 cases, browser project, all pass)"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-08-18
status: complete
---

# Phase 3 Plan 02: Dialog Animation + Focus Teardown (FIX-04, FIX-03) Summary

**am-dialog now drains a reused TeardownScope in a new disconnectedCallback so the nudge animationend listener never dangles (FIX-04), and its _hide() focus restoration is guarded by isConnected so a dialog whose opener was removed closes without throwing and without focusing the detached node (FIX-03).**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-08-18T02:08:23Z
- **Completed:** 2026-08-18T02:11:00Z
- **Tasks:** 2
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments
- **FIX-04:** Added a private `_teardown = new TeardownScope()` field to `AmDialog` (imported from the `src/internal/helpers/teardown-scope.js` boundary, reused from 03-01). `_nudge()` now registers its `animationend` listener with `{ once: true, signal: this._teardown.signal }`, and a new `disconnectedCallback()` calls `super.disconnectedCallback()` then `this._teardown.clear()` — so a dialog disconnected mid-nudge aborts the still-bound listener. Nudge visual behavior (class-remove → reflow → class-add) is unchanged.
- **FIX-03:** Extended the `_hide()` focus-restoration condition to `this._previouslyFocused instanceof HTMLElement && this._previouslyFocused.isConnected`, so `focus()` is skipped when the opener was removed while the dialog was open. Closing no longer targets a disconnected node.
- Proved both fixes TDD (failing-then-passing): a deterministic jsdom disconnect-mid-nudge teardown test (via the captured abort signal), a jsdom removed-opener focus-guard test (no throw, `focus` spy not called), and the browser removed-opener test flipped from an unguarded "finding" to a guarded FIX-03 assertion.

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1 (FIX-04): disconnect-mid-nudge teardown test (RED)** - `e8b1ad7` (test)
2. **Task 1 (FIX-04): _teardown field + disconnectedCallback wiring (GREEN)** - `4e9ed34` (feat)
3. **Task 2 (FIX-03): removed-opener focus-guard test (RED)** - `6a61bc1` (test)
4. **Task 2 (FIX-03): isConnected guard + flipped browser assertion (GREEN)** - `e8faa64` (feat)

## Files Created/Modified
- `src/components/dialog/dialog.ts` - Imported `TeardownScope`; added `_teardown` field; new `disconnectedCallback()` draining the scope; `_nudge()` animationend listener bound to `_teardown.signal`; `_hide()` focus guard extended with `.isConnected`.
- `test/components/dialog.test.ts` - New disconnect-mid-nudge teardown case (FIX-04) + removed-opener focus-guard case (FIX-03); imported `vi`.
- `test/browser/overlay-focus.test.ts` - Dialog removed-opener case retitled and re-commented from unguarded finding to guarded FIX-03 assertion.

## Decisions Made
- Reused the `src/internal` `TeardownScope` helper rather than reimplementing teardown locally (D-09 boundary, per plan).
- Declared `disconnectedCallback()` without the `override` keyword to match `toast.ts` (project does not enable `noImplicitOverride`; `tsc --noEmit` clean either way).
- Asserted FIX-04 teardown deterministically via the captured `TeardownScope` abort signal because jsdom does not auto-fire `animationend`.

## Deviations from Plan

None - plan executed exactly as written.

## Verification
- `npx vitest run test/components/dialog.test.ts --project jsdom` → 14 passed (exit 0), including both new cases and all pre-existing dialog cases green.
- `npx vitest run test/browser/overlay-focus.test.ts --project browser` → 5 passed (exit 0).
- `npx tsc --noEmit` → exit 0.
- Public surface unchanged: no new `@property`/`@fires`/`@slot`/`@csspart`/`@cssprop` in the dialog.ts diff; no `innerHTML`/`eval` present.
- dialog.ts per-file coverage: 98% stmts / 95.45% branch — the new `disconnectedCallback` and `isConnected` branch are exercised.

## Threat Surface
No new trust boundaries, DOM sinks, network, or user-input parsing introduced. STRIDE register entries T-03-02 (nudge listener DoS) and T-03-03 (focus restoration DoS) are mitigated as planned; T-03-SC (no package installs) holds — no supply-chain surface added.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Next Phase Readiness
- FIX-03 and FIX-04 satisfied for am-dialog. The `isConnected` focus-guard pattern is available for any remaining overlays (drawer, command-palette) that restore focus on close, should later plans harden them.
- Frozen public surface unchanged — all changes are internal lifecycle wiring plus one guard condition.

## Self-Check: PASSED

All modified files present on disk; all task commits (`e8b1ad7`, `4e9ed34`, `6a61bc1`, `e8faa64`) found in git history.

---
*Phase: 03-reliability-leak-fixes*
*Completed: 2026-08-18*
