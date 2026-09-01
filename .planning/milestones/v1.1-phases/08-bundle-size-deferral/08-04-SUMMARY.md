---
phase: 08-bundle-size-deferral
plan: 04
subsystem: components
tags: [bundle-size, code-splitting, dynamic-import, floating-ui, virtualizer, combobox, lit, size-05]

# Dependency graph
requires:
  - phase: 08-bundle-size-deferral
    plan: 01
    provides: "src/internal/helpers/lazy-load.ts (loadFloating/prefetchFloating/loadVirtualizer/prefetchVirtualizer) + async FloatingPositionController with the module-receiving middleware getter"
provides:
  - "combobox fully deferred: zero static @floating-ui/dom and @lit-labs/virtualizer runtime imports; size middleware built from the loaded module; repeat()↔virtualize() swap with a cold-chunk fallback; non-critical init deferred off first paint"
  - "reference implementation of the repeat()→virtualize() deferred swap (_renderOptionList + _ensureVirtualizer) that data-grid and select mirror"
affects: [08-05, 08-06, 08-07, select, data-grid]

# Actuals (#2632)
actuals:
  tokens: 3900
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-receiving middleware getter (`middleware: (mod) => [mod.size({...})]`) so the width-match middleware is built from the deferred-loaded floating-ui module instead of a construction-time static array"
    - "Deferred virtualizer swap: a plain `_virtualize` field (undefined until `loadVirtualizer()` resolves) with a fully-functional unwindowed `repeat()` cold-chunk/fetch-failure fallback and identical absolute-index ARIA across the swap"
    - "SIZE-05 bounded idle-init: non-critical listener attach moved off the constructor onto a double-rAF in connectedCallback, teardown-guarded (cancelAnimationFrame + done/handle flags) against double-run/leak"

key-files:
  created: []
  modified:
    - src/components/combobox/combobox.ts
    - test/browser/combobox-virtual.test.ts

key-decisions:
  - "size middleware built from `mod.size` inside the getter (moved OFF the field-init static array which evaluates before the chunk loads) — behavior-preserving width match"
  - "`_virtualize` kept as a plain field (not @state) with an explicit requestUpdate() on resolve, keeping the deferral off the frozen CEM surface"
  - "Deferred the `invalid`-event listener (not an interaction gate) via double-rAF: a form can be submitted without ever focusing the combobox, so a rAF-after-paint attach is safer than a first-interaction gate for this particular listener"

patterns-established:
  - "The `_renderOptionList` repeat()↔virtualize() swap + `_ensureVirtualizer()` is the canonical deferred-virtualizer template for select/data-grid"

requirements-completed: [SIZE-01, SIZE-02, SIZE-05]

# Metrics
duration: ~20min
completed: 2026-08-22
status: complete
---

# Phase 8 Plan 04: Combobox Full Deferral (floating-ui + virtualizer + SIZE-05) Summary

**combobox now carries zero static `@floating-ui/dom` and `@lit-labs/virtualizer` runtime imports — its `size` width-match middleware is built from the deferred-loaded floating-ui module via the controller's module getter, its option list swaps repeat()→virtualize() on chunk resolve with a fully-functional unwindowed repeat() cold-chunk fallback (identical absolute-index ARIA), and its non-critical `invalid` listener is deferred off the first-paint path onto a teardown-guarded double-rAF.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 2 (0 created, 2 modified)

## Accomplishments

- **Task 1 (SIZE-01):** Dropped the static `size as sizeMiddleware` import; moved the `_floatingController` middleware from the construction-time static array to the module-receiving getter `(mod) => [mod.size({ apply(...width match...) })]`, so the middleware is built from the same dynamically-imported module the async controller loads. Warmed the chunk on trigger intent (`pointerenter`/`focusin` on the wrapper, `pointerenter` on the select-mode wrapper) via `prefetchFloating()`. Positions with matched listbox width identically.
- **Task 2 (SIZE-02):** Dropped the static `virtualize` import; added a plain `_virtualize` field and `_ensureVirtualizer()` (kicks the memoized `loadVirtualizer().then(m => { this._virtualize = m.virtualize; this.requestUpdate(); })`). `_renderOptionList` keeps the `filtered.length > VIRTUALIZE_ROW_THRESHOLD` branch but renders `this._virtualize(...)` when resolved and falls back to a fully-functional unwindowed `repeat()` during the cold chunk / on fetch failure. `prefetchVirtualizer()` warms the chunk on popup open near/above threshold. ARIA posinset/setsize compute from the absolute index in both paths, so there is no drift across the swap.
- **Task 3 (SIZE-05):** Moved combobox's non-critical `invalid`-event listener attach out of the constructor onto a double-`rAF` scheduled in `connectedCallback` (after first paint, D-09 — no idle-callback scheduling). `disconnectedCallback` cancels a still-pending schedule, and `_nonCriticalInitDone` / `_deferredInitRaf` guards prevent a double attach across a disconnect→reconnect cycle (no double-run, no leak).
- Extended `test/browser/combobox-virtual.test.ts` with a cold-chunk assertion: above threshold before the virtualizer resolves, the list renders all 1000 options functionally via `repeat()` with correct absolute posinset/setsize, then swaps to the windowed `virtualize()` render after resolve with unchanged ARIA.

## Task Commits

1. **Task 1: size middleware from the loaded module + prefetch** — `5d9056f` (feat)
2. **Task 2: deferred virtualizer + repeat() cold-chunk fallback swap (+ browser test)** — `8a80904` (feat)
3. **Task 3: SIZE-05 deferred non-critical invalid-listener** — `bf99ee4` (perf)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `src/components/combobox/combobox.ts` — dropped both static heavy imports; module-getter `size` middleware; `_virtualize` field + `_ensureVirtualizer()` + repeat() cold-chunk fallback in `_renderOptionList`; `prefetchFloating()`/`prefetchVirtualizer()` warms on intent/open; deferred `invalid` listener via `connectedCallback` double-rAF with teardown guard.
- `test/browser/combobox-virtual.test.ts` — added a cold-chunk fallback→swap assertion; added `waitForWindowed()` and gated the combobox navigation tests on the windowed steady state (deferred-load timing — see Deviations).

## Decisions Made

- **size middleware built inside the getter** — the field-init array evaluates before the chunk loads, so `mod.size` must be resolved at position time.
- **`_virtualize` as a plain field with explicit `requestUpdate()`** — keeps the deferral off the frozen CEM surface while still triggering the repeat()→virtualize() swap on resolve.
- **`invalid` listener deferred via rAF, not an interaction gate** — a form can be submitted without ever focusing the combobox, so a first-interaction gate could miss the constraint-check event; a post-paint rAF attaches unconditionally shortly after first paint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Deferred virtualizer surfaced a scroll-into-view race in the browser navigation tests**
- **Found during:** Task 2
- **Issue:** With the static `virtualize` import, the virtualizer was laid out by the first render, so the existing "End scrolls a far option…" and "preserves the form value…" browser tests could navigate immediately after open. With deferral, the first frames render the `repeat()` fallback and the virtualizer attaches a beat later; pressing `End` in the exact attach frame calls the virtualizer's `element(i).scrollIntoView()` before its first layout, which throws internally (`Cannot set properties of null (setting 'pin')`). During the true cold window there is no virtualizer ref, so `scrollVirtualizerToIndex` is a safe no-op — the throw only occurs in the narrow attach-but-not-laid-out frame.
- **Fix:** Added a `waitForWindowed()` helper and gated `openCombobox()` (used only by the combobox tests) on the windowed steady state before returning, so navigation tests run against a laid-out virtualizer. This reflects real usage (users see the list windowed before navigating). No change to `combobox.ts` behavior — the shared `scrollVirtualizerToIndex` helper was left untouched to avoid conflicting with the parallel select/data-grid wave-2 plans.
- **Files modified:** test/browser/combobox-virtual.test.ts
- **Committed in:** 8a80904

**Total deviations:** 1 (test-timing accommodation for the deferred-load lifecycle; no behavior change to the component).

## Issues Encountered

- **Benign `ResizeObserver loop completed with undelivered notifications` console noise** in the browser lane when the cold-chunk test renders 1000 unwindowed rows then swaps to the windowed virtualizer. This is expected virtualizer/ResizeObserver churn during the swap and does not fail the suite (7/7 pass).
- **Latent cross-consumer observation (out of scope):** the virtualizer's `scrollIntoView` can throw if invoked in the attach-but-not-laid-out frame. This affects any deferred-virtualizer consumer (select, data-grid) equally and would ideally be hardened in the shared `scrollVirtualizerToIndex` helper, but that helper is owned by the parallel wave-2 plans; not modified here to preserve parallel-execution isolation.

## Known Stubs

None — every code path is wired end-to-end (loader → controller/getter → combobox render → real-browser verification). The `repeat()` fallback is a fully-functional unwindowed render, not a placeholder.

## Threat Surface

No new security surface beyond the plan's `<threat_model>`. The three registered threats are actively mitigated:
- **T-08-09 (XSS on the cold-chunk fallback):** the fallback stays a Lit `repeat()` template — no `innerHTML`/`eval` on any degraded path.
- **T-08-10 (virtualizer chunk fetch fails above threshold):** `_ensureVirtualizer().catch()` leaves `_virtualize` undefined and the unwindowed `repeat()` fallback keeps the full list functional.
- **T-08-11 (deferred init interrupted by disconnect):** `disconnectedCallback` cancels the pending rAF and the done/handle guards prevent a double attach — no leaked listener.

No Threat Flags.

## Verification

- `npm run build` — green (combobox chunk carries no static `@floating-ui/dom` / `@lit-labs/virtualizer` imports; grep of `dist/chunks/combobox-*.js` confirms).
- `npx vitest run test/components/combobox.test.ts` — 23/23 pass (unchanged jsdom behavior: open/close, filtering, selection, ARIA, validation, teardown).
- `npx vitest run --project browser test/browser/combobox-virtual.test.ts` — 7/7 pass (windowed subset + full-total aria-setsize, End scroll-into-view to a live id, form value preserved, and the new cold-chunk fallback→swap).
- `combobox.ts` free of static heavy imports and of `requestIdleCallback` (grep confirms 0).
- `npm run diff:surface` — exit 0, no CEM surface drift.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The `_renderOptionList` repeat()↔virtualize() swap plus `_ensureVirtualizer()` is the reference template select and data-grid mirror for their own deferred-virtualizer migrations.
- The module-receiving `size`-middleware getter form is the pattern select/date-picker follow to drop their static floating-ui imports.
- Consider hardening the shared `scrollVirtualizerToIndex` helper (guard the attach-but-not-laid-out frame) once the parallel wave-2 plans that own it have merged.

## Self-Check: PASSED

- Commits `5d9056f`, `8a80904`, `bf99ee4` all present in `git log`.
- `src/components/combobox/combobox.ts`, `test/browser/combobox-virtual.test.ts`, and this SUMMARY all exist on disk.

---
*Phase: 08-bundle-size-deferral*
*Completed: 2026-08-22*
