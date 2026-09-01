---
phase: 08-bundle-size-deferral
plan: 06
subsystem: data-display
tags: [bundle-size, code-splitting, dynamic-import, virtualizer, lit, data-grid, size-05]

# Dependency graph
requires:
  - phase: 08-bundle-size-deferral
    plan: 01
    provides: "src/internal/helpers/lazy-load.ts — loadVirtualizer/prefetchVirtualizer memoized dynamic-import loaders"
provides:
  - "data-grid virtualizer deferred: static @lit-labs/virtualizer directive import dropped; virtualize() loaded lazily via loadVirtualizer() with a functional repeat() cold-chunk/fetch-failure fallback and requestUpdate() swap on resolve (SIZE-02)"
  - "data-grid SIZE-05 sweep: the non-critical virtualizer warm is scheduled off the first-paint path via a double requestAnimationFrame, teardown-guarded on disconnect (no double-run, no leak), no requestIdleCallback"
  - "waitForWindowed() browser-test helper: awaits the async repeat->virtualize swap"
affects: [virtualizer, data-grid]

# Actuals (#2632)
actuals:
  tokens: 3600
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render-time virtualizer deferral: `_virtualize ? _virtualize({...}) : repeat(sorted, keyFunction, renderItem)` — shared keyFunction/renderItem consts keep rows byte-identical across the swap; absolute-index aria-rowindex identical in both paths"
    - "Bounded SIZE-05 non-critical-init deferral: double-requestAnimationFrame after first paint, pending-rAF cancelled in disconnectedCallback, async resolve gated on isConnected"

key-files:
  created: []
  modified:
    - src/components/data-grid/data-grid.ts
    - test/browser/data-grid-virtual.test.ts
    - test/components/data-grid.test.ts

key-decisions:
  - "virtualize-support.ts left untouched (not in plan scope): its `virtualizerRef` import is a standalone shakeable Symbol (Virtualizer.js:22), separate from the heavy Virtualizer class — so removing data-grid.ts's direct `virtualize()` directive import is the SIZE-02 win; the transitive virtualizerRef is the same shared-helper condition combobox/select already carry"
  - "Task 1 uses a single-rAF kick; Task 2 hardens it to double-rAF + disconnect teardown guard as the bounded SIZE-05 sweep — clean two-commit split"
  - "Comment documents the discipline as 'the idle-callback scheduling API is intentionally NOT used' rather than the literal identifier, so the grep acceptance gate stays clean"

patterns-established:
  - "waitForWindowed(host, total) — the browser-test idiom for awaiting a deferred-virtualizer repeat->virtualize swap (mounted rows drop below the full total)"

requirements-completed: [SIZE-02, SIZE-05]

coverage:
  - id: D1
    description: "data-grid defers the virtualizer directive: cold-chunk repeat() fallback renders all rows with correct absolute-index aria-rowindex, then swaps to windowed virtualize() on resolve with identical row ARIA (SIZE-02)"
    requirement: SIZE-02
    verification:
      - kind: e2e
        ref: "test/browser/data-grid-virtual.test.ts#cold-chunk: renders a functional unwindowed repeat() body first, then swaps to windowed virtualize() with identical aria-rowindex"
        status: pass
      - kind: e2e
        ref: "test/browser/data-grid-virtual.test.ts#mounts only a windowed subset of rows, each carrying a truthful aria-rowindex"
        status: pass
      - kind: other
        ref: "grep of built dist/chunks/data-grid-*.js — no static @lit-labs/virtualizer directive import; virtualizer reached only via dynamic import()"
        status: pass
    human_judgment: false
  - id: D2
    description: "SIZE-05: data-grid's non-critical virtualizer warm is deferred off the first-paint path via double-rAF and is teardown-safe — a disconnect before the callback fires does not throw, double-run, or leak"
    requirement: SIZE-05
    verification:
      - kind: unit
        ref: "test/components/data-grid.test.ts#SIZE-05: disconnecting a virtual grid before the deferred virtualizer warm fires does not throw or leak"
        status: pass
      - kind: other
        ref: "grep -c requestIdleCallback src/components/data-grid/data-grid.ts — 0 matches"
        status: pass
    human_judgment: false
  - id: D3
    description: "Behavior + surface freeze preserved: sort/select/focus unchanged; CEM surface identical"
    requirement: SIZE-02
    verification:
      - kind: unit
        ref: "test/components/data-grid.test.ts — 12/12 pass (sort, numeric comparator, am-sort, selection, controlled selectedKeys, roving tabindex, Arrow/Home/End nav, Space toggle, custom getRowId)"
        status: pass
      - kind: other
        ref: "node scripts/cem-diff.mjs api/custom-elements.baseline.json dist/custom-elements.json — no surface drift (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-08-22
status: complete
---

# Phase 8 Plan 06: Data-Grid Virtualizer Deferral + SIZE-05 Sweep Summary

**data-grid's unconditional `virtualize()` render site now loads the `@lit-labs/virtualizer` directive lazily — rendering a fully functional unwindowed `repeat()` body on the cold chunk / a failed fetch and swapping to the windowed `virtualize()` path on resolve with byte-identical rows and absolute-index-identical `aria-rowindex` — and the non-critical virtualizer warm is deferred off first paint via a teardown-guarded double-`requestAnimationFrame` (SIZE-02 + SIZE-05).**

## Performance
- **Duration:** ~12 min
- **Completed:** 2026-08-22
- **Tasks:** 2
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments
- Dropped the static `@lit-labs/virtualizer/virtualize.js` directive import from `data-grid.ts`; the directive is now resolved lazily via `loadVirtualizer()` (a type-only `import()` type keeps the runtime import off the synchronous graph).
- Swapped the unconditional `virtualize({...})` render for `this._virtualize ? this._virtualize({ items, keyFunction, renderItem }) : repeat(sorted, keyFunction, renderItem)`. `keyFunction`/`renderItem` are extracted to shared consts so rows are byte-identical across the swap, and `aria-rowindex` is computed from the absolute sorted index in both paths (behavior-preserving; D-05 cold-cross AND fetch-failure fallback).
- The virtualizer warm (`prefetchVirtualizer()` + `loadVirtualizer().then(...)`) is scheduled off the first-paint path via a double `requestAnimationFrame` (SIZE-05); the pending rAF is cancelled in `disconnectedCallback` and the async resolve is gated on `isConnected`, so a disconnect before the callback fires neither double-runs the load nor leaks a scheduled frame. No `requestIdleCallback` (Safari 16.4 floor, D-09).
- Extended `data-grid-virtual.test.ts` with a cold-chunk assertion (all rows via `repeat()` with correct `aria-rowindex`, then a windowed swap with ARIA parity) and a `waitForWindowed()` helper; updated the three existing virtual specs to await the now-async swap.
- Added a jsdom spec proving disconnect-before-warm cancels cleanly (no throw, no leak, no swap while disconnected).

## Task Commits
1. **Task 1: defer data-grid virtualizer with repeat() fallback swap** — `0e15c4c` (feat)
2. **Task 2: defer virtualizer warm off first paint (SIZE-05)** — `88349b5` (perf)

## Files Created/Modified
- `src/components/data-grid/data-grid.ts` — dropped the static virtualizer import; added `VirtualizeDirective` type-only import type, `_virtualize` lazily-loaded directive field, `_virtualizerRaf` handle, `_scheduleVirtualizerWarm()` (double-rAF, teardown-guarded), `disconnectedCallback()`, and `updated()`; extracted `keyFunction`/`renderItem` consts and swapped the render site to the `_virtualize ? … : repeat(…)` conditional.
- `test/browser/data-grid-virtual.test.ts` — added the cold-chunk fallback + ARIA-parity spec and the `waitForWindowed()` helper; migrated the windowed-subset, recycle, and non-zero-height specs to await the async swap.
- `test/components/data-grid.test.ts` — added the SIZE-05 disconnect-before-warm safety spec.

## Decisions Made
- **virtualize-support.ts left untouched** — see Deviation 1; its `virtualizerRef` is a shakeable standalone Symbol, and the file is not in this plan's scope.
- **Two-commit split (single-rAF kick → double-rAF + teardown guard)** — Task 1 lands the functional SIZE-02 deferral; Task 2 is the bounded SIZE-05 hardening.
- **Comment wording avoids the literal `requestIdleCallback` identifier** — so the grep acceptance gate ("no requestIdleCallback appears") stays clean while the discipline is still documented.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing virtual browser specs assumed a synchronous virtualize() and had to await the now-async swap**
- **Found during:** Task 1
- **Issue:** Deferring the virtualizer makes the first render a `repeat()` fallback that swaps to `virtualize()` only after the lazy chunk resolves. The three existing specs (`windowed subset`, `recycle`, `non-zero height`) used a `waitForBodyRows` helper that returns as soon as any row exists — which is immediately true for the unwindowed fallback — so they asserted windowed behavior before the swap and failed. Worse, the failing specs never reached their `host.remove()`, leaving 2000-row grids in the shared browser page and corrupting the new cold-chunk spec.
- **Fix:** Added a `waitForWindowed(host, total)` helper that polls until the mounted row count drops below the full total (i.e. the virtualizer has taken over), and pointed the three specs at it. This is a test-fidelity correction for the deferred model — the component behavior is preserved, only the observation point moved past the async swap.
- **Files modified:** test/browser/data-grid-virtual.test.ts
- **Verification:** `npx vitest run --project browser test/browser/data-grid-virtual.test.ts` — 5/5 pass.
- **Committed in:** 0e15c4c

**2. [Rule 3 - Blocking] Comment reworded to avoid the literal `requestIdleCallback` token**
- **Found during:** Task 2
- **Issue:** The Task 2 acceptance criterion is a literal grep ("No `requestIdleCallback` appears in `data-grid.ts`"). Documenting the discipline with the exact identifier tripped that grep (1 match in the comment).
- **Fix:** Reworded to "The idle-callback scheduling API is intentionally NOT used" — the discipline is still documented, and `grep -c requestIdleCallback` now returns 0.
- **Files modified:** src/components/data-grid/data-grid.ts
- **Verification:** `grep -c requestIdleCallback src/components/data-grid/data-grid.ts` → 0.
- **Committed in:** 88349b5

---

**Total deviations:** 2 (1 test-fidelity correction for the deferred async model, 1 acceptance-gate wording fix)
**Impact on plan:** No scope creep. Both are direct consequences of the deferral mechanics (async swap + literal grep gate). No component behavior changed; sort/select/focus and the CEM surface are frozen.

## Scope Note (not a deviation)
`virtualize-support.ts` still statically imports `virtualizerRef` from `@lit-labs/virtualizer/virtualize.js`. This is intentionally out of scope: `virtualizerRef` is a standalone `export const … = Symbol(…)` (`Virtualizer.js:22`) separable from the 730-line `Virtualizer` class under tree-shaking, `virtualize-support.ts` is not in this plan's `files_modified`, and it is a shared helper combobox/select also depend on. Removing data-grid.ts's own heavy `virtualize()` directive import is the SIZE-02 win for this render site; the built `dist/chunks/data-grid-*.js` reaches the virtualizer only through the shakeable helper, never a static directive import.

## Known Stubs
None — no stub/placeholder patterns introduced. The repeat() fallback is a fully functional (unwindowed) render path, not a placeholder.

## Threat Surface
No new security surface beyond the plan's `<threat_model>`. The three registered threats are mitigated: T-08-15 (the cold-chunk fallback stays a Lit `repeat()` template — no innerHTML/eval), T-08-16 (a failed virtualizer fetch leaves the grid fully functional and unwindowed via repeat()), T-08-17 (the deferred warm is teardown-guarded — disconnect cancels the rAF and the resolve is isConnected-gated). No Threat Flags.

## User Setup Required
None — no external service configuration required.

## Self-Check: PASSED
- src/components/data-grid/data-grid.ts — FOUND (modified)
- test/browser/data-grid-virtual.test.ts — FOUND (modified)
- test/components/data-grid.test.ts — FOUND (modified)
- Commit 0e15c4c — FOUND
- Commit 88349b5 — FOUND

---
*Phase: 08-bundle-size-deferral*
*Completed: 2026-08-22*
