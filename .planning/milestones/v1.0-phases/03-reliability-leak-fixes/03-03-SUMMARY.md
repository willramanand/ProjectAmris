---
phase: 03-reliability-leak-fixes
plan: 03
subsystem: ui
tags: [lit, web-components, drawer, command-palette, popover, focus, isconnected, leak-fix]

# Dependency graph
requires:
  - phase: 03-reliability-leak-fixes
    provides: isConnected focus-guard pattern established on am-dialog (from 03-02)
provides:
  - am-drawer _hide() focus restoration guarded by isConnected so a removed opener is never focused and never throws (FIX-03)
  - am-command-palette updated() close-branch focus restoration guarded by isConnected (FIX-03)
  - am-popover no-focus-restoration finding documented + close-after-trigger-removed no-throw asserted (FIX-03 overlay set complete)
  - verified-green FIX-02 TEST-05 teardown-spy set (combobox, dropdown, context-menu, date-picker, popover, tooltip) as the pre-freeze regression lock
affects: [drawer, command-palette, popover, FIX-03, FIX-02, reliability-leak-fixes]

# Actuals
actuals:
  tokens: 2030
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isConnected guard on focus restoration (reused from 03-02 dialog): focus() only driven onto _previouslyFocused when it is still an HTMLElement AND connected to the document — applied to drawer and command-palette."

key-files:
  created: []
  modified:
    - src/components/drawer/drawer.ts
    - src/components/command-palette/command-palette.ts
    - test/components/drawer.test.ts
    - test/components/command-palette.test.ts
    - test/components/popover.test.ts

key-decisions:
  - "Reused the isConnected focus-guard shape proven on am-dialog in 03-02 verbatim for drawer and command-palette — one-condition, behavior-preserving for connected openers."
  - "Did NOT refactor the six FIX-02 components (combobox, dropdown, context-menu, date-picker, popover, tooltip): they already gate document listeners on open state and tear them down on disconnect, proven by the Phase 1 TEST-05 teardown spies. A 6-component refactor would add regression risk against this phase's no-regression directive; instead the plan runs those suites as the regression lock."
  - "Documented am-popover as the FIX-03 exception: it holds no _previouslyFocused and performs no focus restoration, so the isConnected discipline is N/A — asserted the trivial no-throw to complete the overlay accounting."

patterns-established:
  - "Overlay focus restoration guards the target with isConnected before calling focus() — now uniform across dialog, drawer, and command-palette; popover documented as having no such path."

requirements-completed: [FIX-03, FIX-02]

coverage:
  - id: D1
    description: "am-drawer _hide() focus restoration is guarded by isConnected; closing a drawer whose opener was removed does not throw and does not call focus() on the disconnected node; connected-opener restoration unchanged (FIX-03)."
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "test/components/drawer.test.ts#does not focus a removed opener on close (FIX-03)"
        status: pass
      - kind: unit
        ref: "test/components/drawer.test.ts#restores focus to a still-connected opener on close (FIX-03)"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-command-palette updated() close-branch focus restoration is guarded by isConnected; closing a palette whose opener was removed does not throw and does not focus the disconnected node; Cmd/Ctrl+K toggle and am-close unchanged (FIX-03)."
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "test/components/command-palette.test.ts#does not focus a removed opener on close (FIX-03)"
        status: pass
      - kind: unit
        ref: "test/components/command-palette.test.ts#restores focus to a still-connected opener on close (FIX-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "am-popover performs no focus restoration (no _previouslyFocused); closing after its trigger is removed cannot throw — documented and asserted, completing the FIX-03 overlay set (FIX-03)."
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "test/components/popover.test.ts#closing after the trigger is removed does not throw (no focus-restoration path)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The six FIX-02 components' global click/keydown listeners are gated on open and torn down on disconnect, proven green by their TEST-05 teardown-spy suites as the pre-freeze regression lock (FIX-02)."
    requirement: FIX-02
    verification:
      - kind: unit
        ref: "test/components/{popover,combobox,dropdown,context-menu,date-picker,tooltip}.test.ts (TEST-05 teardown-spy describes) — 47 passed"
        status: pass
    human_judgment: false
  - id: D5
    description: "No user-visible regression — am-drawer and am-command-palette still open/close, emit am-open/am-close/am-select, restore focus to a still-connected opener, and (palette) toggle on Cmd/Ctrl+K; the six FIX-02 components' behavior is unchanged (no source edits)."
    verification:
      - kind: unit
        ref: "npx vitest run drawer + command-palette + popover + 5 FIX-02 suites --project jsdom (61 passed)"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-08-18
status: complete
---

# Phase 3 Plan 03: Overlay Focus-Guard Completion (FIX-03) + FIX-02 Regression Lock Summary

**am-drawer and am-command-palette now guard focus restoration with isConnected (mirroring the 03-02 dialog fix) so closing an overlay whose opener was removed neither throws nor focuses a disconnected node; am-popover is documented as having no focus-restoration path (finding + no-throw asserted), completing the FIX-03 overlay set; and the six FIX-02 TEST-05 teardown-spy suites are verified green as the pre-freeze regression lock — no FIX-02 source refactor.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-08-18T22:13:00Z
- **Completed:** 2026-08-18T22:16:00Z
- **Tasks:** 3
- **Files modified:** 5 (0 created, 5 modified)

## Accomplishments
- **FIX-03 (drawer):** Extended `_hide()`'s focus-restoration condition to `this._previouslyFocused instanceof HTMLElement && this._previouslyFocused.isConnected`. Closing a drawer whose opener was removed while open no longer targets the detached node. Proved TDD (failing removed-opener test → guard), plus a connected-opener restoration case covering the other branch.
- **FIX-03 (command-palette):** Extended the `updated()` close-branch condition with the same `.isConnected` guard. Cmd/Ctrl+K global-keydown toggle, input-focus-on-open, and `am-close` dispatch left untouched. Proved TDD (failing removed-opener test → guard) with a connected-opener restoration case.
- **FIX-03 (popover finding):** Confirmed `am-popover` has no `_previouslyFocused` and calls `focus()` on no node — it is a non-modal click/hover/manual panel that never moves focus into itself. Added a documented finding case asserting close-after-trigger-removed does not throw; the isConnected discipline is N/A here. FIX-03 overlay set now complete: dialog (03-02) / drawer / command-palette guarded; popover documented.
- **FIX-02 (regression lock):** Ran the six existing TEST-05 teardown-spy suites (combobox, dropdown, context-menu, date-picker, popover, tooltip) — all green (47 passed). These already assert attach-on-open / detach-on-close / detach-on-disconnect (tooltip asserts the no-document-listener case). No source refactor undertaken: the six components are already gated-on-open + torn-down-on-disconnect, and a refactor would add regression risk against the phase's no-regression directive.

## Task Commits

Each task was committed atomically (Tasks 1 & 2 TDD RED → GREEN):

1. **Task 1 (FIX-03): removed-opener focus-guard test for drawer (RED)** - `d446c47` (test)
2. **Task 1 (FIX-03): isConnected guard in drawer _hide() (GREEN)** - `8707507` (feat)
3. **Task 2 (FIX-03): removed-opener focus-guard test for command-palette (RED)** - `0ba6619` (test)
4. **Task 2 (FIX-03): isConnected guard in command-palette close-branch (GREEN)** - `fc6cc28` (feat)
5. **Task 3 (FIX-03/FIX-02): popover finding + FIX-02 regression-lock verification** - `8ea96ce` (test)

## Files Created/Modified
- `src/components/drawer/drawer.ts` - `_hide()` focus guard extended with `.isConnected`.
- `src/components/command-palette/command-palette.ts` - `updated()` close-branch focus guard extended with `.isConnected`.
- `test/components/drawer.test.ts` - Added `vi` import; removed-opener + connected-opener focus-guard cases (FIX-03).
- `test/components/command-palette.test.ts` - Added `vi` import; removed-opener + connected-opener focus-guard cases (FIX-03).
- `test/components/popover.test.ts` - Added FIX-03 finding describe: close-after-trigger-removed no-throw + documented no-focus-restoration finding.

## Decisions Made
- Reused the exact isConnected guard shape from the 03-02 dialog fix rather than devising a new pattern — one condition, behavior-preserving for connected openers.
- Verified FIX-02 rather than refactoring: the six components already satisfy the gated-on-open + torn-down-on-disconnect invariant (proven by Phase 1 TEST-05 spies); a 6-component rewrite would add regression risk against the no-regression directive.
- Documented am-popover as the overlay-set exception (no focus-restoration path) instead of adding a guard where none is needed.

## Deviations from Plan

None - plan executed exactly as written.

## Verification
- `npx vitest run test/components/drawer.test.ts test/components/command-palette.test.ts --project jsdom` → 14 passed (exit 0), including both new FIX-03 cases each.
- `npx vitest run test/components/popover.test.ts test/components/combobox.test.ts test/components/dropdown.test.ts test/components/context-menu.test.ts test/components/date-picker.test.ts test/components/tooltip.test.ts --project jsdom` → 47 passed (exit 0) — the FIX-02 regression lock plus the popover finding.
- Full plan suite (all 8 files) → 61 passed (exit 0).
- `npx tsc --noEmit` → exit 0.
- `git diff` shows no source edits to the six FIX-02 component files (only drawer.ts + command-palette.ts source changed, from Tasks 1 & 2); no `innerHTML`/`eval` added.

## Threat Surface
No new trust boundaries, DOM sinks, network, or user-input parsing introduced. STRIDE register entry T-03-04 (drawer/command-palette focus restoration DoS) is mitigated by the isConnected guards; T-03-05 (6 overlay document listeners) is accepted and verified green by TEST-05 spies; T-03-SC (no package installs) holds — no supply-chain surface added.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Next Phase Readiness
- FIX-03 is now complete across the entire focus-restoring overlay set (dialog, drawer, command-palette guarded; popover documented). FIX-02's gated-on-open + torn-down-on-disconnect discipline is confirmed uniform and proven green.
- Frozen public surface unchanged — all changes are one guard condition per component plus tests.

## Self-Check: PASSED

All modified files present on disk; all task commits (`d446c47`, `8707507`, `0ba6619`, `fc6cc28`, `8ea96ce`) found in git history.

---
*Phase: 03-reliability-leak-fixes*
*Completed: 2026-08-18*
