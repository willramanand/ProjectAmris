---
phase: 03-reliability-leak-fixes
plan: 01
subsystem: ui
tags: [lit, web-components, toast, teardown, timers, abortcontroller, leak-fix]

# Dependency graph
requires:
  - phase: 02-api-freeze
    provides: non-exported src/internal/ boundary convention (FloatingPositionController, D-09)
provides:
  - TeardownScope shared teardown primitive (src/internal/helpers/teardown-scope.ts)
  - am-toast dismiss timer + animationend listener now tracked and cleared via _clearTimer() (FIX-01)
  - dedicated TeardownScope unit suite proving cancel-timers + abort-listeners + reuse-after-clear
affects: [03-02, dialog, FIX-04, reliability-leak-fixes]

# Actuals
actuals:
  tokens: 1800
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TeardownScope: one scope per component tracks fire-and-forget timers + an AbortController signal; a single clear() cancels all timers and aborts all signal-bound listeners, then refreshes the controller for reuse"

key-files:
  created:
    - src/internal/helpers/teardown-scope.ts
    - test/internal/teardown-scope.test.ts
  modified:
    - src/components/toast/toast.ts
    - test/components/toast.test.ts

key-decisions:
  - "TeardownScope lives under src/internal/ (off the frozen CEM/public surface), imported only by components, never re-exported from src/index.ts / src/index.all.ts — mirrors the FloatingPositionController boundary convention (D-09)."
  - "Auto-dismiss _timer + pause/resume handles left untouched — only the fire-and-forget dismiss fallback + animationend listener moved into the scope (behavior-preserving)."
  - "clear() installs a fresh AbortController after abort() so a single scope survives repeated open/dismiss cycles without leaking the aborted signal."

patterns-established:
  - "Shared teardown discipline (tracer for FIX-04): track every timer + abortable listener, drain them all in the single teardown method disconnectedCallback already calls."

requirements-completed: [FIX-01]

coverage:
  - id: D1
    description: "am-toast dismiss setTimeout fallback + animationend listener are tracked and cleared via _clearTimer(); a toast removed mid-dismiss leaves no pending callback and fires no am-close post-removal (FIX-01)."
    requirement: FIX-01
    verification:
      - kind: unit
        ref: "test/components/toast.test.ts#clears the dismiss fallback timer and fires no am-close after mid-dismiss removal"
        status: pass
    human_judgment: false
  - id: D2
    description: "TeardownScope primitive: timeout() fires when uncleared and is cancelled by clear(); signal-bound listeners are removed on clear(); clear() yields a fresh non-aborted signal for reuse."
    verification:
      - kind: unit
        ref: "test/internal/teardown-scope.test.ts#TeardownScope"
        status: pass
    human_judgment: false
  - id: D3
    description: "No user-visible regression — am-toast still renders, auto-dismisses on duration, pauses/resumes on hover, dismisses on close-button click, and emits am-close as before."
    verification:
      - kind: unit
        ref: "test/components/toast.test.ts (22 pre-existing + new cases, jsdom project, all pass)"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-08-17
status: complete
---

# Phase 3 Plan 01: Toast Dismiss Teardown (FIX-01) Summary

**TeardownScope shared teardown primitive established as the phase tracer; am-toast's untracked dismiss fallback timer + animationend listener are now cancelled through _clearTimer(), so a toast removed mid-dismiss leaves no pending callback.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-17T22:03:00Z
- **Completed:** 2026-08-17T22:06:00Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Created `TeardownScope` (src/internal/helpers/teardown-scope.ts): a fire-and-forget tracker holding a `Set` of timer handles + an `AbortController`, with `timeout(handler, ms)`, a `signal` getter, and a `clear()` that cancels all timers, aborts all signal-bound listeners, and refreshes the controller for reuse. Off the frozen public surface.
- Wired `am-toast` to the scope: `_dismiss()` now uses `this._teardown.timeout(onEnd, 300)` and `{ signal: this._teardown.signal }` on the `animationend` listener; `_clearTimer()` (already called by `disconnectedCallback`) drains the scope. Removing a toast mid-dismiss now leaves no dangling timer/listener and fires no `am-close` on the detached node (FIX-01).
- Proved the fix with a failing-then-passing mid-dismiss teardown test, and independently proved the reusable primitive with a dedicated 4-case unit suite.

## Task Commits

Each task was committed atomically (TDD):

1. **Task 1 (tracer): mid-dismiss teardown test (RED)** - `9faf2ac` (test)
2. **Task 1 (tracer): TeardownScope + toast wiring (GREEN)** - `ada0cf5` (feat)
3. **Task 2: dedicated TeardownScope unit suite** - `36718c0` (test)

_Note: Task 1 is the phase tracer executed TDD (test → feat)._

## Files Created/Modified
- `src/internal/helpers/teardown-scope.ts` - New non-exported `TeardownScope` class (methods `timeout`, `clear`; getter `signal`).
- `src/components/toast/toast.ts` - Added `_teardown: TeardownScope` field; rewired `_dismiss()` fallback + animationend listener through the scope; extended `_clearTimer()` to call `_teardown.clear()`.
- `test/components/toast.test.ts` - New `describe` block asserting mid-dismiss removal leaves no pending callback.
- `test/internal/teardown-scope.test.ts` - New dedicated unit suite for `TeardownScope`.

## Decisions Made
- None beyond the plan — followed the tracer spec as written. Kept the auto-dismiss/pause-resume `_timer` logic untouched (behavior-preserving) and scoped only the genuine leak (the dismiss fallback + animationend listener).

## Deviations from Plan

None - plan executed exactly as written.

## Tracer Feedback Gate
The tracer's `<verify>` is fully automated (`npx vitest run test/components/toast.test.ts --project jsdom`) with no visual/functional human component. It passed end-to-end (22/22 toast cases, tsc clean) before any expansion work, satisfying the tracer gate. A human-verify checkpoint was not emitted because the only verification is a CLI test run, which the checkpoint protocol reserves for Claude, not the user. Expansion (Task 2) proceeded on the proven slice.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TeardownScope is ready for reuse by plan 03-02 (FIX-04, dialog animation cleanup) — the tracer proved the "track every timer + abortable listener; drain in the single teardown method" discipline end-to-end.
- Full plan verification green: `npx vitest run test/components/toast.test.ts test/internal/teardown-scope.test.ts --project jsdom` (26 passed) and `npx tsc --noEmit` (exit 0).
- Frozen public surface unchanged — helper is internal-only and not re-exported.

## Self-Check: PASSED

All created/modified files present on disk; all task commits (`9faf2ac`, `ada0cf5`, `36718c0`) found in git history.

---
*Phase: 03-reliability-leak-fixes*
*Completed: 2026-08-17*
