---
phase: 03-reliability-leak-fixes
plan: 04
subsystem: ui
tags: [lit, web-components, command-palette, dialog, drawer, toast, code-review, gap-closure, frozen-api]

# Dependency graph
requires:
  - phase: 03-reliability-leak-fixes
    provides: leak-fix source (dialog/drawer/command-palette/toast) landed by 03-01/03-02/03-03
provides:
  - am-command-palette keyboard nav + Enter selection index into the rendered grouped order (_ordered), so highlight and selection agree even on interleaved consumer groups (CR-01)
  - am-dialog / am-drawer / am-command-palette suppress the spurious mount-time am-close while still firing am-open + showing when mounted open (WR-01)
  - am-toast dismiss completes only on the host's own toast-out animationend (or the 300ms fallback), never on composed animationend bubbling from shadow descendants (WR-02)
affects: [command-palette, dialog, drawer, toast, CR-01, WR-01, WR-02, reliability-leak-fixes]

# Actuals
actuals:
  tokens: 4214
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single rendered-order source of truth for keyboard vs render: a private `_ordered` getter groups `_filtered` by first-seen group and flattens (`Array.from(groups.values()).flat()`), matching render()'s flat itemIndex — nav and Enter index into it so highlight == selection."
    - "Mount-safe overlay lifecycle: updated() reacts to a genuine transition only — show whenever `open` is truthy (covers mount-with-open → am-open), and run the hide/am-close branch only when the previous open value existed (`else if (prev)`), where `prev = changed.get('open')` is undefined on first update."
    - "Animation-name-gated completion: a composed `animationend` host listener gates on `e.animationName === 'toast-out'`; the timeout fallback calls the handler with no event so it still completes. `once:true` dropped because a one-shot listener could be consumed by an unrelated bubbling event before the real exit animation."

key-files:
  created: []
  modified:
    - src/components/command-palette/command-palette.ts
    - src/components/dialog/dialog.ts
    - src/components/drawer/drawer.ts
    - src/components/toast/toast.ts
    - test/components/command-palette.test.ts
    - test/components/dialog.test.ts
    - test/components/drawer.test.ts
    - test/components/toast.test.ts

key-decisions:
  - "CR-01: introduced a private `_ordered` getter reused by _handleKeydown (length bound + Enter target). render() already builds an identical first-seen-group Map, so its flat itemIndex order equals `_ordered` — no render output change for contiguous data, indices now provably aligned for interleaved data."
  - "WR-01: used the `else if (prev)` shape (NOT the bare `changed.get('open') !== undefined` guard from the review snippet) because that bare guard also suppresses the mount-with-open _show, breaking am-open on `<am-* open>`. The chosen shape shows whenever open is truthy and only skips the hide branch on the never-opened first update."
  - "WR-02: gated onEnd on `animationName === 'toast-out'` and dropped `once:true`; the 300ms teardown fallback calls `onEnd()` eventless so auto-dismiss and click-close still complete and fire exactly one am-close."

patterns-established:
  - "Keyboard-navigable grouped lists must index into the same flattened order render() emits, not the pre-group source array."
  - "Reactive-property lifecycle side effects that dispatch public events must gate on a real transition (previous value present), never fire on the first update where changedProperties includes every initialized property."
  - "Host listeners for composed animation/transition events must disambiguate by name before acting, since descendant animations bubble to the host."

requirements-completed: [FIX-01, FIX-03]

coverage:
  - id: D1
    description: "CR-01 — command-palette keyboard nav + Enter index into the rendered grouped order; on non-contiguous groups (A,B,A) the .highlighted DOM item equals the Enter-selected command."
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "test/components/command-palette.test.ts#Enter selects the visually highlighted item when groups interleave (CR-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-01 — dialog/drawer/command-palette emit zero am-close on a closed initial mount."
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "test/components/{dialog,drawer,command-palette}.test.ts#does not emit a spurious am-close on initial mount while closed (WR-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "WR-01 guard — mounting with open still fires am-open (dialog/drawer) and shows the dialog; command-palette shows and emits no am-close."
    requirement: FIX-03
    verification:
      - kind: unit
        ref: "test/components/{dialog,drawer}.test.ts#still fires am-open and shows when mounted with open (WR-01 guard); command-palette.test.ts#opens and does not emit am-close when mounted with open (WR-01 guard)"
        status: pass
    human_judgment: false
  - id: D4
    description: "WR-02 — toast dismiss is not completed by a non-toast-out composed animationend (toast-in / countdown bubbling from descendants); still dismissing, no premature am-close."
    requirement: FIX-01
    verification:
      - kind: unit
        ref: "test/components/toast.test.ts#does not complete the dismiss on a non-toast-out animationend (WR-02)"
        status: pass
    human_judgment: false
  - id: D5
    description: "WR-02 guard — a real toast-out animationend completes the dismiss and fires exactly one am-close; the 300ms fallback still completes with no event and does not double-fire."
    requirement: FIX-01
    verification:
      - kind: unit
        ref: "test/components/toast.test.ts#completes the dismiss on the real toast-out animationend and fires one am-close (WR-02); #still completes the dismiss via the 300ms fallback with no animationend (WR-02)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No user-visible regression — full jsdom (464) and browser (39) suites green; tsc clean; frozen public surface unchanged; no innerHTML/eval added."
    verification:
      - kind: unit
        ref: "npx vitest run --project jsdom (464 passed); --project browser (39 passed); npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-08-17
status: complete
---

# Phase 3 Plan 04: Code-Review Gap Closure (CR-01, WR-01, WR-02) Summary

**Closed the three 03-REVIEW.md defects that shipped in phase-modified files on the frozen v1.0 surface: command-palette keyboard nav + Enter now index into the same flattened grouped order render() emits (so highlight and selection agree on interleaved consumer groups, CR-01); dialog/drawer/command-palette no longer emit a spurious am-close on a never-opened mount while still firing am-open + showing when mounted open (WR-01); and toast dismiss completes only on its own toast-out animationend or the 300ms fallback, never on composed animationend bubbling from the countdown ring or toast-in entrance (WR-02) — all test-first (RED → GREEN), no public surface change.**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-08-17
- **Tasks:** 3
- **Files modified:** 8 (0 created, 8 modified)

## Accomplishments
- **CR-01 (command-palette wrong-command on interleaved groups):** Added a private `_ordered` getter that groups `_filtered` by first-seen group and flattens it — the exact order render() emits via its flat `itemIndex`. `_handleKeydown` (ArrowDown/ArrowUp length bound + Enter target) now indexes into `_ordered` instead of the raw `_filtered`. On `[{A},{B},{A}]` the visually `.highlighted` item and the Enter-executed command are now provably the same; existing contiguous-group nav/select tests unchanged.
- **WR-01 (spurious mount am-close):** Each of dialog/drawer/command-palette `updated()` now reads `prev = changed.get('open')` (undefined on the first update), shows whenever `open` is truthy, and runs the hide/`am-close` branch only when `prev` is truthy (`else if (prev)`). A never-opened overlay emits no `am-close` on mount; `<am-dialog open>` / `<am-drawer open>` on mount still fire `am-open` and show; real open→close transitions and Cmd/Ctrl+K toggle are unchanged.
- **WR-02 (premature toast dismiss):** `_dismiss()`'s `onEnd` now takes an optional `AnimationEvent` and returns early unless `e.animationName === 'toast-out'`; `once:true` was dropped so an unrelated bubbling `animationend` (countdown ring, `toast-in`) can no longer consume the one-shot listener. The 300ms teardown fallback calls `onEnd()` with no event, so auto-dismiss / click-close still complete and fire exactly one `am-close`.

## Task Commits

Each task committed atomically, TDD RED → GREEN:

1. **Task 1 (CR-01): interleaved-group selection test (RED)** - `066a561` (test)
2. **Task 1 (CR-01): _ordered getter drives keyboard nav (GREEN)** - `0932d74` (fix)
3. **Task 2 (WR-01): spurious mount am-close tests, 3 components (RED)** - `a8a333c` (test)
4. **Task 2 (WR-01): else-if-prev transition guard, 3 components (GREEN)** - `63b2f95` (fix)
5. **Task 3 (WR-02): premature dismiss on bubbled animationend test (RED)** - `3fa02d4` (test)
6. **Task 3 (WR-02): gate onEnd on animationName === 'toast-out' (GREEN)** - `c58252f` (fix)

## Files Created/Modified
- `src/components/command-palette/command-palette.ts` - Added `_ordered` getter; `_handleKeydown` indexes into it; `updated()` close branch gated on prior open state.
- `src/components/dialog/dialog.ts` - `updated()` shows on truthy open, `_hide()` only on `else if (prev)`.
- `src/components/drawer/drawer.ts` - Same `else if (prev)` transition guard in `updated()`.
- `src/components/toast/toast.ts` - `_dismiss()` `onEnd` gated on `animationName === 'toast-out'`; `once:true` dropped; fallback calls `onEnd()` eventless.
- `test/components/command-palette.test.ts` - Added interleaved-group CR-01 case + two WR-01 mount cases.
- `test/components/dialog.test.ts` - Added WR-01 closed-mount + mounted-open guard cases.
- `test/components/drawer.test.ts` - Added WR-01 closed-mount + mounted-open guard cases.
- `test/components/toast.test.ts` - Added three WR-02 cases (non-toast-out no-op, real toast-out completes once, fallback completes).

## Decisions Made
- CR-01: reused render()'s existing first-seen-group Map logic in a private `_ordered` getter rather than restructuring render() — indices align with zero render-output change for contiguous data.
- WR-01: deliberately did NOT use the review snippet's bare `changed.get('open') !== undefined` guard, which would also suppress the mount-with-open `_show` and break `am-open`. The `else if (prev)` shape shows on any truthy open and only skips the hide branch on the never-opened first update. Regression tests lock both directions.
- WR-02: chose the animation-name gate over keeping `once:true`, because a one-shot listener is vulnerable to being consumed by an unrelated composed `animationend` before the real exit animation fires.

## Deviations from Plan

None - plan executed exactly as written.

## Verification
- `npx vitest run test/components/command-palette.test.ts test/components/dialog.test.ts test/components/drawer.test.ts test/components/toast.test.ts --project jsdom` → all green (exit 0), including the six new RED-first cases.
- Full regression: `npx vitest run --project jsdom` → 464 passed (69 files); `npx vitest run --project browser` → 39 passed (5 files).
- `npx tsc --noEmit` → exit 0.
- `git grep -nE "innerHTML|eval\(" src/components/command-palette src/components/dialog src/components/drawer src/components/toast` → no matches.
- Frozen surface intact: no new public `@property`/`@fires`/slots/parts added on the four components (diff of `e537c82..HEAD` shows none); `TeardownScope` still not re-exported from `src/index.ts` / `src/index.all.ts`.

## Threat Surface
No new trust boundaries, DOM sinks, network, or user-input parsing introduced. All three changes are behavior-narrowing (index into the rendered order; skip a spurious event; gate on animation name) and add no new public surface. CR-01 additionally closes a correctness hazard where a consumer with interleaved command groups could trigger an unintended `cmd.action?.()`.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Next Phase Readiness
- All three shipping code-review defects (CR-01 critical, WR-01/WR-02 warnings) are closed on the frozen v1.0 surface; the four leak-fix criteria from 03-01/02/03 remain green. Info items IN-01 (unused `oneEvent` import — now naturally consumed by the new toast tests only if referenced; still dead if not) and IN-02 (benign nudge listener churn) were out of this plan's scope and left as documented in 03-REVIEW.md.
- Public surface unchanged; the phase is ready for freeze/verification.

## Self-Check: PASSED

All four source files and four test files present on disk; all six task commits (`066a561`, `0932d74`, `a8a333c`, `63b2f95`, `3fa02d4`, `c58252f`) found in git history.

---
*Phase: 03-reliability-leak-fixes*
*Completed: 2026-08-17*
