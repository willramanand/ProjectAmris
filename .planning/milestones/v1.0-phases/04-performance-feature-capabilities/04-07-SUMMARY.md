---
phase: 04-performance-feature-capabilities
plan: 07
subsystem: ui
tags: [floating-ui, autoupdate, overlays, reactive-controller, lit, popover, tooltip, dropdown]

# Dependency graph
requires:
  - phase: 04-04
    provides: Phase-4 validation wiring on select/date-picker (preserved, not touched at the floating seam)
  - phase: 02 (02-07)
    provides: FloatingPositionController + combobox/select/date-picker already delegating positioning to it
provides:
  - PERF-04 gating — autoUpdate starts only on the open/show transition and stops on close/hide + disconnect across all seven overlays
  - am-popover, am-tooltip, am-dropdown migrated off inline autoUpdate onto the shared FloatingPositionController
  - FloatingPositionController extended with lazy option getters (placement/offset/strategy/middleware) + onPositioned arrow-readback callback
  - test/components/autoupdate-gating.test.ts — teardown-spy invariant lock for all seven overlays
affects: [overlay components, floating-ui positioning, future overlay additions, v1.0 freeze]

# Actuals (#2632)
actuals:
  tokens: 6471
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Open-transition-gated autoUpdate: host calls controller.start() on false→true and stop() on true→false; hostDisconnected()→stop() is the leak guard"
    - "Resolvable<T> option pattern — controller options accept a value OR a getter, resolved per-reposition, so hosts with live positioning properties migrate behavior-preservingly"
    - "onPositioned readback callback — arrow-rendering overlays position their arrow from middlewareData without owning the compute loop"

key-files:
  created:
    - test/components/autoupdate-gating.test.ts
  modified:
    - src/internal/controllers/floating-position.ts
    - src/components/popover/popover.ts
    - src/components/tooltip/tooltip.ts
    - src/components/dropdown/dropdown.ts

key-decisions:
  - "Extended FloatingPositionController with Resolvable option getters + onPositioned rather than capturing values at construction — required to migrate popover/tooltip (live placement/offset, lazy arrow @query element) without a user-facing behavior change."
  - "Migrated am-tooltip and am-dropdown (not just am-popover) onto the controller to satisfy the prohibition against per-component ad-hoc autoUpdate lifecycles."
  - "Left am-context-menu untouched — it positions at the cursor once with no autoUpdate loop, so there is nothing to gate or leak."
  - "Left am-combobox/select/date-picker untouched — already delegate to the controller and already gate start() on the open transition."

patterns-established:
  - "Pattern 4 (Open-transition-gated autoUpdate): autoUpdate lifecycle is host-gated at the open-state transition; the controller never self-starts while closed."
  - "Resolvable<T> lazy option resolution for shared positioning controllers."

requirements-completed: [PERF-04]

coverage:
  - id: D1
    description: "am-popover migrated onto FloatingPositionController (no inline autoUpdate); arrow positioning preserved via onPositioned"
    requirement: PERF-04
    verification:
      - kind: unit
        ref: "test/components/popover.test.ts (existing suite green post-migration)"
        status: pass
      - kind: unit
        ref: "test/components/autoupdate-gating.test.ts#am-popover — autoUpdate open-transition gating (PERF-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-tooltip and am-dropdown migrated onto FloatingPositionController, behavior-preserving"
    requirement: PERF-04
    verification:
      - kind: unit
        ref: "test/components/autoupdate-gating.test.ts#am-tooltip / am-dropdown gating (PERF-04)"
        status: pass
      - kind: unit
        ref: "test/components/tooltip.test.ts, dropdown.test.ts (existing suites green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "autoUpdate gated to open transition across all seven overlays — starts on open/show only, stops on close/hide, stops on disconnect-while-open (no dangling loop)"
    requirement: PERF-04
    verification:
      - kind: unit
        ref: "test/components/autoupdate-gating.test.ts (13 tests, all seven overlays)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Behavior-preserving — full jsdom suite stays green with zero edits to unrelated tests"
    verification:
      - kind: unit
        ref: "npm test -- --run (72 files, 576 tests)"
        status: pass
    human_judgment: false

# Metrics
duration: ~15min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 07: autoUpdate Open-Transition Gating Summary

**All seven floating-ui overlays now start `autoUpdate` only on their open/show transition and tear it down on close/hide + disconnect; am-popover, am-tooltip, and am-dropdown are migrated off inline autoUpdate onto a shared FloatingPositionController extended with lazy option getters and an arrow-readback callback — behavior-preserving, locked by a jsdom teardown-spy test.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-18
- **Tasks:** 2
- **Files modified:** 4 (1 created)

## Accomplishments
- Extended `FloatingPositionController` with `Resolvable<T>` option getters (placement/offset/strategy/middleware, resolved per-reposition) and an `onPositioned` callback so arrow-rendering overlays can place their arrow from `middlewareData` without owning the compute loop.
- Migrated `am-popover`, `am-tooltip`, and `am-dropdown` off inline `autoUpdate` + manual `_cleanupAutoUpdate` onto the shared controller — positioning, arrow placement, and open/close behavior unchanged.
- Confirmed `am-combobox`, `am-select`, `am-date-picker` were already gated (controller.start() only on the open transition) — no change needed.
- Confirmed `am-context-menu` uses no autoUpdate loop (cursor-positioned once) — nothing to gate or leak.
- Added `test/components/autoupdate-gating.test.ts`: a TEST-05 teardown-spy suite asserting, for all seven overlays, start-on-open-only, stop-on-close, and stop-on-disconnect-while-open.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate/gate inline-autoUpdate overlays onto FloatingPositionController** - `47167be` (refactor)
2. **Task 2: Confirm form-overlay gating + lock the invariant with a teardown-spy test** - `80b9290` (test)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified
- `src/internal/controllers/floating-position.ts` - Added `Resolvable<T>` type + `resolve()` helper; option getters for placement/offset/strategy/middleware; `onPositioned` callback; updated JSDoc to describe host-gated PERF-04 lifecycle.
- `src/components/popover/popover.ts` - Replaced inline `autoUpdate`/`_startAutoUpdate`/`_updatePosition`/`_cleanupAutoUpdate` with a `FloatingPositionController`; arrow positioned via `onPositioned`.
- `src/components/tooltip/tooltip.ts` - Same migration; removed now-unused write-only `_visible` field (the `visible` attribute remains the state driver).
- `src/components/dropdown/dropdown.ts` - Same migration (no arrow).
- `test/components/autoupdate-gating.test.ts` - New teardown-spy invariant test (13 tests across seven overlays).

## Decisions Made
- **Extended the controller instead of capturing option values at construction.** am-popover/tooltip read live `placement`/`offset` at position time and resolve their `arrow` middleware element from a `@query` that only exists after render. Capturing those once at controller construction would have silently broken dynamic placement/offset and arrow positioning. `Resolvable<T>` getters + `onPositioned` keep the migration byte-for-byte behavior-preserving. Existing consumers pass plain values and are unaffected (additive, backward-compatible).
- **Migrated tooltip and dropdown too, not only popover.** The plan's prohibition forbids per-component ad-hoc autoUpdate lifecycles where the shared controller applies; migrating all three removes the last inline loops.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended FloatingPositionController beyond the plan's `middleware` pass-through**
- **Found during:** Task 1 (popover/tooltip migration)
- **Issue:** The plan assumed each overlay's placement/middleware could be preserved via the controller's existing `middleware` option. That is insufficient for popover/tooltip: their `placement`/`offset` are live properties and their `arrow` middleware needs an element resolved lazily after render, plus an arrow-position readback from `middlewareData` that the controller discarded. A naive migration would have changed user-facing positioning (broken arrow, stale placement) — violating the behavior-preserving prohibition.
- **Fix:** Added `Resolvable<T>` (value-or-getter) resolution for `placement`/`offset`/`strategy`/`middleware` and an `onPositioned` callback carrying `{ x, y, placement, middlewareData }`. `src/internal/controllers/floating-position.ts` was modified even though it is not listed in the plan's `files_modified` — it is the shared enabler for the migration.
- **Files modified:** src/internal/controllers/floating-position.ts
- **Verification:** `npx tsc --noEmit` clean; full jsdom suite (576 tests) green; existing combobox/select/date-picker suites unchanged and green (they pass plain values, unaffected by the additive getters).
- **Committed in:** 47167be (Task 1 commit)

**2. [Rule 1 - Bug/cleanup] Removed write-only `_visible` field in am-tooltip**
- **Found during:** Task 1 (tooltip migration)
- **Issue:** After removing the inline `_updatePosition` visibility guard, `_visible` was written but never read — `noUnusedLocals` (strict mode) failed the build.
- **Fix:** Removed the field and its two assignments; the `visible` attribute (used by `:host([visible])` CSS and set alongside) remains the sole visibility state. No test referenced `_visible`.
- **Files modified:** src/components/tooltip/tooltip.ts
- **Verification:** `npx tsc --noEmit` clean; tooltip suite green.
- **Committed in:** 47167be (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking enabler, 1 strict-mode cleanup)
**Impact on plan:** Both necessary to complete the behavior-preserving migration under TypeScript strict mode. No scope creep — no new public surface, no user-facing behavior change, freeze-neutral.

## Issues Encountered
- None beyond the deviations above. select and date-picker required no changes (already gated); context-menu required no changes (no autoUpdate loop).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PERF-04 complete: no autoUpdate loop runs while an overlay is closed, and none dangles after disconnect, proven across all seven overlays by a teardown-spy test.
- The shared FloatingPositionController is now the single positioning path for every positioned overlay — future overlays should adopt the same open-transition gating.

## Self-Check: PASSED

- FOUND: src/internal/controllers/floating-position.ts (modified)
- FOUND: src/components/popover/popover.ts (modified)
- FOUND: src/components/tooltip/tooltip.ts (modified)
- FOUND: src/components/dropdown/dropdown.ts (modified)
- FOUND: test/components/autoupdate-gating.test.ts (created)
- FOUND commit: 47167be (Task 1)
- FOUND commit: 80b9290 (Task 2)

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
