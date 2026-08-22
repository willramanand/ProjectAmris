---
phase: 08-bundle-size-deferral
plan: 02
subsystem: overlays
tags: [bundle-size, code-splitting, dynamic-import, floating-ui, lit, overlays, tooltip, color-picker]

# Dependency graph
requires:
  - phase: 08-bundle-size-deferral
    plan: 01
    provides: "src/internal/helpers/lazy-load.ts (loadFloating/prefetchFloating) + module-receiving middleware-getter on FloatingPositionController + the per-overlay no-0,0-frame browser spec template"
provides:
  - "tooltip fully deferred: static `arrow` import dropped, arrow middleware built from the loaded module (mod.arrow), prefetch-on-intent"
  - "color-picker fully deferred via the shared loader on its ONE-SHOT positioning path — NO autoUpdate, NO FloatingPositionController (Pitfall CP1 preserved)"
  - "two NEW per-overlay no-0,0-frame browser specs (tooltip, color-picker), each its own file (parallel-worktree safe)"
affects: [08-03, 08-04, 08-05, 08-06, 08-07]

# Actuals (#2632)
actuals:
  tokens: 2200
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Overlay migrates off its static @floating-ui/dom import onto the shared memoized loader one plan at a time; controller middleware getter receives the loaded module (mod.arrow)"
    - "ONE-SHOT positioning exception (Pitfall CP1): a single computePosition per open awaited via loadFloating() directly — deliberately NOT routed through FloatingPositionController, whose start() always arms autoUpdate"
    - "Per-overlay no-0,0-frame browser spec: fixed+auto element stays at its static (non-0,0) position across the loader gap; each overlay gets its own spec file so parallel Wave-2 plans never collide"

key-files:
  created:
    - test/browser/overlay-no-zero-frame-tooltip.test.ts
    - test/browser/overlay-no-zero-frame-color-picker.test.ts
  modified:
    - src/components/tooltip/tooltip.ts
    - src/components/color-picker/color-picker.ts

key-decisions:
  - "tooltip prefetch hung inside the existing `_handleEnter` intent handler (after the disabled/no-content guard) — warms the chunk during the show-delay window; tooltip's focus path already routes through _handleEnter, so a separate @focusin prefetch would double-bind"
  - "color-picker kept EXACTLY one-shot: _updatePosition awaits loadFloating() then a single mod.computePosition with mod.offset/flip/shift — no autoUpdate wrapper, no controller (Pitfall CP1 / T-08-06)"
  - "color-picker prefetch wired via new @pointerenter/@focusin handlers on the trigger (its click/blur handlers already existed); mirrors popover's warm-on-intent"

patterns-established:
  - "The one-shot loader-direct positioning path is the template for any future overlay whose positioning must not become a continuous autoUpdate loop"

requirements-completed: [SIZE-01]

coverage:
  - id: D1
    description: "tooltip floating-ui deferred end-to-end (shared loader + module-getter arrow middleware); positioning behavior-preserving in real Chromium; no static runtime @floating-ui/dom import remains on the tooltip path"
    requirement: SIZE-01
    verification:
      - kind: other
        ref: "npm run build (tsc strict + vite) — only the type-only `type Placement` import of @floating-ui/dom remains in tooltip.ts (grep confirms)"
        status: pass
      - kind: unit
        ref: "test/components/tooltip.test.ts — 6/6 pass unchanged (behavior-preserving)"
        status: pass
      - kind: e2e
        ref: "test/browser/overlay-no-zero-frame-tooltip.test.ts — tip never painted at (0,0) while unpositioned; positions to a non-(0,0) rect below the trigger"
        status: pass
      - kind: other
        ref: "npm run diff:surface — CEM/public surface unchanged (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "color-picker floating-ui deferred via the shared loader while preserving its EXACT one-shot, no-autoUpdate positioning; no FloatingPositionController involvement; behavior + surface unchanged (Pitfall CP1)"
    requirement: SIZE-01
    verification:
      - kind: other
        ref: "grep of color-picker.ts — zero static @floating-ui/dom import; the only FloatingPositionController occurrence is a JSDoc note that it is deliberately NOT used"
        status: pass
      - kind: unit
        ref: "test/components/color-picker.test.ts — 12/12 pass unchanged (behavior-preserving; open/validation/swatch paths intact)"
        status: pass
      - kind: e2e
        ref: "test/browser/overlay-no-zero-frame-color-picker.test.ts — panel never painted at (0,0) while unpositioned; single computePosition positions it to a non-(0,0) rect below the trigger"
        status: pass
      - kind: other
        ref: "npm run diff:surface — CEM/public surface unchanged (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-22
status: complete
---

# Phase 8 Plan 02: Tooltip + Color-Picker Floating-UI Deferral Summary

**@floating-ui/dom moved off the synchronous graph of two more overlays with distinct positioning contracts — tooltip (autoUpdate + arrow, mirroring the popover tracer) sources its arrow middleware from the deferred-loaded module, and color-picker keeps its byte-for-byte ONE-SHOT positioning by routing straight through the shared loader (never the always-autoUpdate controller) — both prefetch-on-intent, positioning behavior-preserving, surface frozen.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-22T23:33:01Z
- **Completed:** 2026-08-22T23:41:29Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Migrated `tooltip.ts` off its static `arrow` import: the controller middleware getter now receives the deferred-loaded module and calls `mod.arrow({ element: this.arrowEl })` (mirrors popover from 08-01); `onPositioned` arrow-readback unchanged; `prefetchFloating()` hung off the existing `_handleEnter` intent handler so the chunk warms during the show-delay window. Only the type-only `type Placement` import of `@floating-ui/dom` remains.
- Migrated `color-picker.ts` off its static `computePosition/flip/offset/shift` import while preserving its EXACT one-shot positioning (Pitfall CP1): `_updatePosition` now `await loadFloating()` then performs a SINGLE `mod.computePosition(...)` with `mod.offset(4)/mod.flip()/mod.shift({padding:8})` and writes `left/top` exactly as before — NO `autoUpdate`, NO `FloatingPositionController`. Added `prefetchFloating()` on new `@pointerenter`/`@focusin` trigger handlers.
- Created two NEW per-overlay no-0,0-frame browser specs — `overlay-no-zero-frame-tooltip.test.ts` and `overlay-no-zero-frame-color-picker.test.ts` — each its own file (never extending 08-01's popover spec), so no two Wave-2 plans write the same test file (parallel-worktree safe). Each polls frames across the real dynamic-`import()` gap and asserts the overlay is never painted at viewport `(0,0)` while unpositioned, then reveals at a non-`(0,0)`, trigger-anchored rect.

## Task Commits

Each task was committed atomically:

1. **Task 1: tooltip — arrow middleware from the loaded module + prefetch** — `8be4816` (feat)
2. **Task 2: color-picker — one-shot positioning through the loader (NOT the controller)** — `e2f5f74` (feat)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified
- `src/components/tooltip/tooltip.ts` — dropped static `arrow` import (kept `type Placement`); `mod.arrow(...)` module-getter middleware; `prefetchFloating()` on intent.
- `src/components/color-picker/color-picker.ts` — dropped static floating-ui import; `_updatePosition` awaits `loadFloating()` then one `mod.computePosition`; new `_handlePrefetch` on `@pointerenter`/`@focusin`.
- `test/browser/overlay-no-zero-frame-tooltip.test.ts` (new) — tooltip no-0,0 invariant across the loader gap.
- `test/browser/overlay-no-zero-frame-color-picker.test.ts` (new) — color-picker one-shot no-0,0 invariant across the loader gap.

## Decisions Made
- **tooltip prefetch inside `_handleEnter`** — the tooltip's hover AND focus intent already route through `_handleEnter`, so wiring `prefetchFloating()` there (after the disabled/no-content guard) warms the chunk during the show-delay without double-binding a second `@focusin`.
- **color-picker kept strictly one-shot** — routed through `loadFloating()` directly, never `FloatingPositionController`, so no continuous reposition loop is introduced (the D-06 "shared loader" branch, not the controller branch).
- **color-picker prefetch via new trigger handlers** — added `@pointerenter`/`@focusin` (its `@click`/`@blur` already existed), mirroring popover's warm-on-intent policy.

## Deviations from Plan

None - plan executed exactly as written. Both overlays migrated with only the specified changes; all four verification gates (build, component tests, browser no-0,0 specs, surface diff) passed on first run.

## Issues Encountered
- **Build byproduct (not a code change):** `npm run build` rewrites `docs/contract.md` with identical content (only line-ending normalization); `git diff --stat` shows no content delta. Left unstaged — it is a generated artifact, not part of either task's logical change.

## Known Stubs
None — both migrations are wired end-to-end (loader → positioning → real-browser no-0,0 assertion). No stub/placeholder patterns introduced.

## Threat Surface
No new security surface beyond the plan's `<threat_model>`. The three registered threats are actively mitigated: T-08-04 (both overlays reuse `loadFloating()`'s bare static `import()` specifier — no computed module path, deps stay external), T-08-05 (color-picker's reveal follows its single `computePosition`; a failed chunk fetch shows no broken 0,0 panel), T-08-06 (color-picker is verifiably NOT wired to `FloatingPositionController` — grep + the unchanged 12/12 component test + surface-diff guard confirm no reposition loop was added). No Threat Flags.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- tooltip + color-picker now carry zero static floating-ui runtime imports; the remaining static-import overlays (combobox/select `size` middleware, rich-select) migrate in 08-03+.
- The one-shot loader-direct positioning path established here is the template for any future overlay whose positioning must stay a single computePosition (no autoUpdate loop).
- The aggregate full-bundle/overlay brotli drop continues to accrue as later plans remove the remaining static floating-ui imports (per 08-01's RESEARCH A2); re-check `size-baseline.mjs --check` after the phase's overlays are all migrated.

## Self-Check: PASSED

---
*Phase: 08-bundle-size-deferral*
*Completed: 2026-08-22*
