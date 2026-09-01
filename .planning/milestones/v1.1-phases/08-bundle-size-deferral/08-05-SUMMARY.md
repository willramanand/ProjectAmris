---
phase: 08-bundle-size-deferral
plan: 05
subsystem: components
tags: [bundle-size, code-splitting, dynamic-import, floating-ui, virtualizer, select, lit, overlays]

# Dependency graph
requires:
  - phase: 08-bundle-size-deferral
    plan: 01
    provides: "src/internal/helpers/lazy-load.ts memoized loaders (loadFloating/prefetchFloating/loadVirtualizer/prefetchVirtualizer) + FloatingPositionController module-receiving middleware getter"
provides:
  - "select fully deferred: no static @floating-ui/dom or @lit-labs/virtualizer runtime import; size width-match middleware built from the loaded module; virtualize() render site swaps repeat()→virtualize() on chunk resolve; prefetch on intent"
  - "virtualize-support.ts static-graph virtualizer leak closed: scrollVirtualizerToIndex resolves the virtualizerRef instance off the host's own symbol keys, so importing the helper no longer pulls @lit-labs/virtualizer into a consumer's static graph"
affects: [08-06, 08-07, select, virtualizer, data-grid, combobox]

# Actuals (#2632)
actuals:
  tokens: 3025
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Overlay dual-deferral: floating-ui size middleware via the controller's (mod) => [mod.size(...)] getter + virtualizer render site behind loadVirtualizer() with a functional unwindowed repeat() cold-chunk fallback that swaps to virtualize() on resolve (D-05/D-06)"
    - "Lazily-resolved runtime symbol: read the virtualizer's virtualizerRef instance off the host's own Object.getOwnPropertySymbols keys (description + element() capability guard) instead of a static import — a shared internal helper stays free of any static/dynamic virtualizer reference, so the dep is reached ONLY behind lazy-load's import()"

key-files:
  created: []
  modified:
    - src/components/select/select.ts
    - src/internal/helpers/virtualize-support.ts
    - test/browser/virtualize-smoke.test.ts
    - .planning/phases/08-bundle-size-deferral/deferred-items.md

key-decisions:
  - "scrollVirtualizerToIndex resolves virtualizerRef off the host's own symbol keys (the plan's permitted 'lazily-resolved symbol' arm) rather than caching the loadVirtualizer() module — the cached-module form would eagerly trigger the virtualizer fetch on the helper's documented below-threshold no-op calls, defeating SIZE-02. The host-symbol read never loads and stays a true no-op when nothing is attached."
  - "select prefetches floating-ui on pointerenter intent and the virtualizer near-threshold / on popup open (D-01/D-03/D-04); the virtualizer render swap is guarded by a _virtualizerLoading flag so the memoized load is issued once, not per render."

patterns-established:
  - "A shared internal helper closes its own static-graph dep leak by resolving the runtime symbol off the host instead of importing it — the byte win is only real once the helper (not just the component) is deferral-clean"

requirements-completed: [SIZE-01, SIZE-02]

coverage:
  - id: D1
    description: "select's floating-ui size width-match middleware sourced from the deferred-loaded module via the controller's (mod)=>[mod.size(...)] getter; positioning behavior-preserving; select's own chunk carries no static @floating-ui/dom import"
    requirement: SIZE-01
    verification:
      - kind: other
        ref: "npm run build — dist/chunks/select-*.js has no static @floating-ui/dom import; floating-ui reached only via the shared loader chunk's import()"
        status: pass
      - kind: unit
        ref: "npx vitest run test/components/select.test.ts — 37/37 pass unchanged (open/close, filtering, width-match, selection)"
        status: pass
      - kind: other
        ref: "npm run diff:surface — exit 0, CEM surface frozen"
        status: pass
    human_judgment: false
  - id: D2
    description: "select's virtualize() render site defers behind loadVirtualizer() with a functional unwindowed repeat() cold-chunk fallback that swaps to windowed virtualize() on resolve, selection behavior-preserving (SIZE-02 adjacency edge)"
    requirement: SIZE-02
    verification:
      - kind: e2e
        ref: "test/browser/virtualize-smoke.test.ts#renders a functional unwindowed repeat() before load, then swaps to windowed virtualize() — cold frame = 150 rows with identical ARIA, windowed after resolve, click selects"
        status: pass
      - kind: other
        ref: "npm run build — dist/chunks/select-*.js has no static @lit-labs/virtualizer import"
        status: pass
    human_judgment: false
  - id: D3
    description: "virtualize-support.ts no longer statically imports the runtime virtualizerRef symbol — importing the helper does not pull @lit-labs/virtualizer into a consumer's static graph; the virtualizer appears only behind a dynamic import() (SIZE-02 empty edge — the hidden static-graph leak)"
    requirement: SIZE-02
    verification:
      - kind: other
        ref: "npm run build — dist/chunks/virtualize-support-*.js contains ZERO @lit-labs/virtualizer reference (static or dynamic); grep of dist shows the virtualizer only behind import() in the lazy-load chunk"
        status: pass
      - kind: e2e
        ref: "test/browser/virtualize-smoke.test.ts#scrolls a far, virtualized-out index into the DOM via the virtualizerRef proxy — still works with the host-symbol resolution (real Chromium)"
        status: pass
      - kind: other
        ref: "node scripts/assert-no-bundled-lit.mjs — exit 0, zero inlined-Lit markers (Lit stays external)"
        status: pass
    human_judgment: false
  - id: D4
    description: "scrollVirtualizerToIndex remains a safe no-op when no virtualizer is attached (below threshold / before load) so callers stay safe during the fallback window, and never triggers the virtualizer load"
    requirement: SIZE-02
    verification:
      - kind: unit
        ref: "npx vitest run test/components/select.test.ts — 37/37 pass with zero unhandled errors; below-threshold and cold-window keyboard-nav scroll calls no-op cleanly"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-08-22
status: complete
---

# Phase 8 Plan 05: Select Dual-Deferral + Virtualize-Support Leak Closure Summary

**select now carries zero static @floating-ui/dom and @lit-labs/virtualizer runtime imports — its size width-match middleware comes from the deferred-loaded module via the controller's module-getter and its virtualize() render site swaps from a functional unwindowed repeat() cold fallback to the windowed directive on chunk resolve — while virtualize-support.ts drops its static virtualizerRef import and resolves the symbol off the host, closing the hidden static-graph leak that would otherwise have kept the virtualizer in every consumer's graph and near-zeroed the SIZE-02 win.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-08-22
- **Tasks:** 2
- **Files modified:** 4 (0 created, 4 modified)

## Accomplishments
- Dropped select's static `size` (@floating-ui/dom) and `virtualize` (@lit-labs/virtualizer) imports; the width-match `size` middleware is now built from the deferred-loaded module via the controller's `middleware: (mod) => [mod.size({...})]` getter (08-01's union option), byte-identical width behavior.
- Swapped select's `virtualize()` render site to a `_virtualize`-or-`repeat()` fallback: above threshold before the chunk resolves the popup renders a fully-functional unwindowed `repeat()` over the SAME state model with identical per-row ARIA, then swaps to the windowed `virtualize()` directive once `loadVirtualizer()` resolves (D-05). Guarded by a `_virtualizerLoading` flag so the memoized load fires once.
- Wired prefetch on intent: `prefetchFloating()` on the trigger's `pointerenter`, and `prefetchVirtualizer()` near-threshold on the trigger intent and on the popup-open transition (D-01/D-03/D-04).
- Closed the virtualize-support.ts static-graph leak: removed the static runtime `virtualizerRef` import and now resolve the `Virtualizer` instance off the host's own `Object.getOwnPropertySymbols` keys (description match + `element()` capability guard). The helper carries no static OR dynamic @lit-labs reference; the virtualizer is reached only behind lazy-load's `import()`.
- Extended `virtualize-smoke.test.ts` with a real-Chromium select cold-chunk assertion: unwindowed `repeat()` (150 rows, correct ARIA) before load → windowed `virtualize()` after resolve → click-to-select works.

## Task Commits

Each task was committed atomically:

1. **Task 1: defer select floating-ui size middleware + virtualizer render site** — `e0359df` (feat)
2. **Task 2: close virtualize-support static-graph virtualizer leak** — `a605df9` (refactor)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Modified
- `src/components/select/select.ts` — dropped static `size`/`virtualize` imports; module-getter `size` middleware; `_virtualize`/`_virtualizerLoading` state; `_renderVirtualOptions` repeat↔virtualize swap; `prefetchFloating`/`prefetchVirtualizer` on intent + open; added `repeat` import.
- `src/internal/helpers/virtualize-support.ts` — removed static `virtualizerRef`/`VirtualizerHostElement` import; local `VirtualizerLike` structural type; `resolveHostVirtualizer` reads the symbol off the host; `scrollVirtualizerToIndex` routed through it. Threshold + ARIA helpers + 2.1.1 pin unchanged.
- `test/browser/virtualize-smoke.test.ts` — added the select deferred-virtualizer cold-chunk fallback + windowed-swap + selection browser spec.
- `.planning/phases/08-bundle-size-deferral/deferred-items.md` — logged (then annotated as incidentally resolved) the pre-existing jsdom virtualizer `scrollIntoView` error.

## Decisions Made
- **Host-symbol resolution over cached-module resolution for `scrollVirtualizerToIndex`** — see Deviation 1.
- **`_virtualizerLoading` guard on the render-site load** — avoids re-attaching a `.then` to the memoized `loadVirtualizer()` promise on every cold render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking / plan-permitted alternative] `scrollVirtualizerToIndex` resolves `virtualizerRef` off the host's symbol keys, not via a cached `loadVirtualizer()` module**
- **Found during:** Task 2
- **Issue:** The plan's primary suggestion — cache the `loadVirtualizer()` module result and read `virtualizerRef` from it — would eagerly trigger the virtualizer `import()` on `scrollVirtualizerToIndex`'s documented below-threshold no-op calls (the helper's JSDoc states it is invoked unconditionally and must no-op when no virtualizer is attached; select's `_setHighlighted`/combobox/data-grid all call it). Kicking off the load there would defeat the SIZE-02 deferral for non-virtualizing lists.
- **Fix:** Used the plan's explicitly-permitted "lazily-resolved symbol" arm: `resolveHostVirtualizer` reads the `Virtualizer` the directive stored on the host under `virtualizerRef` via `Object.getOwnPropertySymbols(host)` (matched by the stable `Symbol('virtualizerRef')` description plus an `element()` capability check). Fully synchronous, never loads the chunk, and a true no-op when nothing is attached — so virtualize-support.ts contains zero static/dynamic @lit-labs reference.
- **Files modified:** src/internal/helpers/virtualize-support.ts
- **Verification:** dist virtualize-support chunk has zero @lit-labs reference; browser scroll-to-index spec still green; `select.test.ts` 37/37 with zero unhandled errors.
- **Committed in:** a605df9

**Total deviations:** 1 (a plan-permitted design-option selection, chosen to protect the SIZE-02 deferral).
**Impact on plan:** No scope creep. Both tasks land exactly as scoped; the deviation strengthens the deferral guarantee versus the plan's primary suggestion.

## Scope Boundary Notes
- `combobox` (migrates in 08-04) and `data-grid` still carry their OWN direct static `virtualize` imports — out of scope for 08-05. The leak *through* the shared `virtualize-support.ts` is closed regardless of their migration state; those components' remaining static imports are their own direct directive usage, not a leak through the helper.

## Issues Encountered
- **Pre-existing jsdom virtualizer `scrollIntoView` error (NOT a regression, incidentally resolved):** `@lit-labs/virtualizer` `Virtualizer._scrollElementIntoView` throws `Cannot set properties of null (setting 'pin')` under jsdom (no real layout). Surfaced once as an unhandled error during Task 1's `select.test.ts` run (suite still 37/37). After Task 2's deferral + host-symbol capability guard, the jsdom keyboard-nav call lands during the cold `repeat()` window (virtualizer not yet attached) and no-ops cleanly, so it no longer reproduces. Documented in `deferred-items.md` for history; no fix required.

## Known Stubs
None — no stub/placeholder patterns introduced. Both deferral paths are wired end-to-end (loader → controller/render swap → real-Chromium windowing & positioning; host-symbol resolution proven by the browser scroll-to-index spec).

## Threat Surface
No new security surface beyond the plan's `<threat_model>`. The three registered threats are actively mitigated: T-08-12 (cold-chunk fallback stays a Lit `repeat()` template — no innerHTML/eval), T-08-13 (repeat() keeps the popup functional if the virtualizer chunk fetch fails), T-08-14 (virtualize-support's static virtualizer import removed — no leak into non-virtualizing consumer graphs; the deep-import purity assertion in 08-07 will verify absence). No Threat Flags.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- select mirrors the popover (08-01) dual-deferral pattern and the shared `virtualize-support.ts` helper is now deferral-clean, so 08-06/08-07 can measure the real SIZE-02 win without the hidden helper leak masking it.
- 08-07's deep-import purity assertion is the guard that will confirm non-virtualizing entries carry no virtualizer in their static graph.

## Self-Check: PASSED

- All 4 modified files present on disk.
- Both task commits present: `e0359df` (Task 1), `a605df9` (Task 2).

---
*Phase: 08-bundle-size-deferral*
*Completed: 2026-08-22*
