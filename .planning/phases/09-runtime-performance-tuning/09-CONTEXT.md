# Phase 9: Runtime-Performance Tuning - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Cut main-thread work on the three heaviest components — **data-grid sort**,
**combobox filter**, **overlay reposition** — so each does measurably less work on
the throttled `low-end-cellular` profile, **every change behavior- AND
surface-preserving** against the frozen v1.0 CEM, **re-measured against the
post-deferral (Phase 8) baseline** (count + wall-clock), and **a11y DOM provably
intact** (`aria-*`, roles, focusability). Closes RPERF-01…RPERF-04.

Delivers:
- **RPERF-01** — data-grid re-render-on-sort narrowed behavior-preservingly, count +
  wall-clock improvement vs post-deferral baseline.
- **RPERF-02** — combobox filter-per-keystroke work reduced behavior-preservingly, re-measured.
- **RPERF-03** — overlay reposition churn reduced behavior-preservingly, re-measured.
- **RPERF-04** — accessible-name/role snapshots guard each tuned component (proof the
  tuning strips no a11y DOM).
- **Rider (folded, see D-05):** fix the open Phase-8 Critical **CR-01** (`lazy-load.ts`
  caches a rejected `import()` → permanent brick) while re-touching these exact files.

**Not this phase:**
- Bundle-size deferral (`@floating-ui/dom` / `@lit-labs/virtualizer` dynamic imports) → **Phase 8, done**.
- Graceful degradation / feature detection below Safari 16.4 → **Phase 10** (COMPAT-*).
- Flipping any size/count budget from **report-only to enforcing** → **Phase 11** (GATE-*).
  All budgets stay report-only this phase; the tuning win posts as a number, nothing red-builds.
- Per-component cost cards / docs publication → **Phase 11** (DOCS-04).

</domain>

<decisions>
## Implementation Decisions

### Combobox Filter Reduction (RPERF-02)
- **D-01:** **Memoize only — no debounce.** `filterOptions(this._allOptions, this.value,
  this.remote)` currently runs **3×+ per keystroke** (render() line 938, the ListboxNav
  `getOptions` callback line 196, keydown line 704, the count getter line 795, the
  select-mode `_dropdownQuery` path line 893) and `_allOptions` (line 532) re-spreads
  `[...this.options, ...this._slottedOptions]` on every call. Reduce the work by computing
  the filtered list **once per render/keystroke and reusing it**, memoized by
  `(options-identity, slotted-identity, value, remote)` — thread the single result through
  the render + nav paths instead of recomputing. **Do NOT debounce** — debouncing shifts the
  observable `am-search` event cadence (remote mode) and *when* the list visibly updates as
  the user types, which is behavior the frozen surface must preserve. Pure dedupe/memoization
  is behavior-preserving. — **Reversibility:** reversible (local caching inside combobox).

### Data-Grid Sort Narrowing (RPERF-01)
- **D-02:** **Memoize the sort only** — do **not** additionally narrow the non-sort render
  path this phase. `_sortedRows` (line 392) does `[...this.rows].sort(cmp * dir)` inside a
  getter called on **every** `render()` — so focus moves (`_focusedRowIndex`), selection
  (`_internalSelected`), and any state change re-clone + re-sort the full dataset even when
  the sort is unchanged. Cache the sorted array keyed on `(rows-identity, _sortKey, _sortDir)`
  so only an actual sort/data change recomputes it; the `keydown` (line 446), virtual (line
  538), and non-virtual (line 618) read sites reuse the cache. This is the clear count +
  wall-clock win with the **smallest regression surface** on the frozen render path. Deeper
  render-narrowing (skip full re-render on selection/focus) is deferred unless the baseline
  says sort isn't the dominant cost. — **Reversibility:** reversible (memo field inside data-grid).

### Overlay Reposition Churn (RPERF-03)
- **D-03:** **Tune the one shared `FloatingPositionController`, validated on the browser lane.**
  The churn is structural and shared: `_updatePosition` (`floating-position.ts:146`) rebuilds
  the `[offset, flip, shift, ...hostMiddleware]` array and re-runs the `resolve()` getters
  (`placement`, `strategy`, `offset`, `middleware`) on **every** `autoUpdate` tick (scroll,
  resize, layout). Reducing churn in the shared controller fixes **all 6 overlays at once**
  (combobox, select, dropdown, popover, tooltip, date-picker) rather than leaving the win
  unbanked on a single representative. Keep the existing autoUpdate **open-gating** and the
  `_startToken` close-during-load guard exactly as-is (PERF-04 / Phase-8 invariants). Because
  blast radius = every overlay, the **browser regression lane is the gate** (per Phase-8
  lesson: jsdom mocks ResizeObserver and cannot exercise real positioning). — **Reversibility:**
  costly — the controller is the shared chokepoint for 6 overlays; a churn-reduction bug
  regresses all of them, so behavior-preservation must be proven on the browser lane before merge.

### Behavior-Preservation Proof / A11y Guard (RPERF-04)
- **D-04:** **Accessible-name/role snapshots run on the BROWSER lane, per tuned component.**
  For each of data-grid, combobox, and a representative overlay, snapshot the accessible
  name + computed role + focusability of the key nodes (grid/row/cell/columnheader +
  `aria-sort`/`aria-rowindex`; combobox `role=combobox` + `aria-activedescendant` + option
  `aria-posinset`/`aria-setsize`; overlay trigger/panel roles) and assert the tuning leaves
  them byte-identical. Run these on `test/browser/**` (real a11y tree), NOT jsdom — jsdom's
  mocked observers/positioning can't prove the windowed/positioned DOM is a11y-intact. No
  existing `getAccessibleName`/aria-snapshot harness exists yet — this is new (report-only)
  test machinery slotting into the browser lane alongside `a11y.browser.test.ts`.
  — **Reversibility:** reversible (test-only).

### Scope — Fold CR-01 (carry-forward Critical)
- **D-05:** **Fold the CR-01 fix into Phase 9.** The open Phase-8 Critical (tracked in
  `08-REVIEW.md`) — `src/internal/helpers/lazy-load.ts` memoizes with `??=`, caching a
  **rejected** `import()` promise so one transient chunk-load failure permanently bricks
  positioning/virtualization page-wide with no retry — lives in the **exact files Phase 9
  re-touches** (the shared controller + virtualizer callers) and rides the **same browser
  regression gate**. Fix = null the cache slot on rejection so the next call retries;
  behavior-preserving, no new public API. Closing it here retires a pre-ship Critical
  without a separate pass. Consider the sibling advisory findings in the same report while
  in the file — **WR-02** (no-`0,0` reveal gate missing on tooltip/dropdown/combobox/select/
  color-picker) and **WR-03** (fire-and-forget `start()` unhandled rejections) — but scope
  them as opportunistic, not required (they are not RPERF requirements). — **Reversibility:**
  reversible (localized helper fix).

### Claude's Discretion
- **Exact churn-reduction mechanism inside the shared controller** (D-03): cache the static
  slice of the middleware array and only rebuild the host-specific tail; hoist `resolve()`
  calls whose sources are fixed values (combobox/select/date-picker pass fixed
  placement/offset) so only the getter-backed hosts (popover/tooltip/dropdown) re-resolve;
  and/or coalesce repositions. Pick from the measured baseline; keep the `computePosition`
  output identical.
- **Memoization shape** for D-01/D-02 (module-level vs instance field; identity vs
  value-equality cache key) — implementation detail; instance field keyed on identity is the
  likely fit.
- **Which single overlay** represents "overlay" for the a11y snapshot + the perf re-measure —
  reuse the Phase-7 perf-scenario overlay (`test/perf/overlay.perf.test.ts`) for an apples-to-apples delta.
- **Whether to re-capture the post-deferral perf baseline** before/after, or diff against the
  committed `api/perf.baseline.json` — planner decides; the requirement is a demonstrated
  count + wall-clock improvement, measured with the existing harness + tachometer.
- **Whether WR-02/WR-03** get fixed alongside CR-01 (D-05) — opportunistic, not required.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (locked)
- `.planning/REQUIREMENTS.md` — RPERF-01…RPERF-04 (the four requirements this phase closes) +
  the **surface-freeze rule** (every change behavior- and surface-preserving against the frozen
  v1.0 CEM; no `[CS]` items in Phase 9).
- `.planning/ROADMAP.md` §"Phase 9: Runtime-Performance Tuning" — goal + 4 success criteria (the acceptance bar).

### Research (implementation-grounding — codebase-verified)
- `.planning/research/PITFALLS.md` — perf-measurement pitfalls (jsdom/unthrottled perf noise,
  flaky-gate variance band) and the behavior-preservation guardrails; **read before designing any tuning**.
- `.planning/research/ARCHITECTURE.md` — the `src/internal/` chokepoint boundary the controller/helper edits ride.
- `.planning/research/SUMMARY.md`, `.planning/research/FEATURES.md`, `.planning/research/STACK.md` — supporting context.

### Prior-phase context & the carry-forward Critical
- `.planning/phases/08-bundle-size-deferral/08-CONTEXT.md` — Phase 8 deferral decisions; the
  post-deferral chunk graph Phase 9 tunes against.
- `.planning/phases/08-bundle-size-deferral/08-PATTERNS.md` — exact per-file analog map for the
  same components (data-grid `_sortedRows`/virtualize swap, combobox `_renderOptionList`, the
  shared controller, `lazy-load.ts`). Primary structural reference for what these files already look like.
- `.planning/phases/08-bundle-size-deferral/08-REVIEW.md` — **CR-01** (rejected-promise cache in
  `lazy-load.ts`, the D-05 fold-in target), **WR-02** (no-`0,0` reveal gate gaps), **WR-03**
  (fire-and-forget `start()` rejections). Read before touching `lazy-load.ts`.

### Existing code to tune / modify (in-repo)
- `src/components/data-grid/data-grid.ts` — `_sortedRows` getter (line 392, the re-sort-on-every-render
  target); read sites at lines 446 / 538 / 618; `virtualize()`↔`repeat()` swap at 609–611 (leave intact).
- `src/components/combobox/combobox.ts` — `filterOptions` call sites (196, 704, 795, 893, 938),
  `_allOptions` getter (532), `_handleInput` (661), `render()` (932), `_renderOptionList` (820).
- `src/internal/controllers/floating-position.ts` — the **shared** controller; `_updatePosition`
  (146) rebuilds middleware + re-runs `resolve()` every autoUpdate tick (the RPERF-03 target).
  Preserve `start()`/`stop()` open-gating + `_startToken` guard.
- `src/internal/controllers/option-filter.ts` — the pure `filterOptions(options, query, remote)`
  the combobox memoization wraps (do not change its semantics — behavior-preserving).
- `src/internal/helpers/lazy-load.ts` — CR-01 fix target (`??=` caches rejected promise; null-on-reject).
  Has a test-only `__resetLazyLoadCachesForTest()` for deterministic cold-load specs.

### Measurement / verification infrastructure (Phase 7 — report-only)
- `test/perf/harness.ts` + `test/perf/{data-grid,combobox,overlay,button}.perf.test.ts` — the
  committed throttled (CDP 6×-CPU + Slow-3G) count + wall-clock scenarios; **the before/after
  re-measurement for RPERF-01…03 runs here.** `button.perf.test.ts` = light-component noise control.
- `api/perf.baseline.json` — committed post-deferral perf baseline; the improvement is diffed against it.
- `scripts/perf-diff.mjs` — the committed-baseline diff comparator (report-only → enforcing in Phase 11).
- `tachometer/{data-grid,combobox,overlay}.json` + `tachometer/benches/` — local-only, ungated A/B
  for a trustworthy before/after delta during tuning.
- `test/browser/**` — the real-browser regression gate (`npm run test:browser`): `floating-position.test.ts`,
  `data-grid-virtual.test.ts`, `combobox-virtual.test.ts`, `overlay-focus.test.ts`, `a11y.browser.test.ts`,
  and the Phase-8 no-`0,0`-frame specs. **The a11y-name/role snapshots (D-04) and the overlay-churn
  validation (D-03) live here.** jsdom cannot substitute (mocks ResizeObserver/positioning).
- `.size-limit.json` — unchanged this phase (no bytes move); confirm no size regression as a side effect.

### Codebase maps
- `.planning/codebase/CONCERNS.md` — §Performance Bottlenecks: data-grid full-DOM render, combobox
  filter-per-keystroke, floating-ui autoUpdate churn (the exact three targets, pre-cut).
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/TESTING.md` — the `src/internal/` boundary + test-lane shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The Phase-7 perf harness + tachometer configs already target these exact three components** —
  `test/perf/{data-grid,combobox,overlay}.perf.test.ts` and `tachometer/{data-grid,combobox,overlay}.json`.
  No new measurement scaffolding needed; the before/after delta reuses them directly.
- **`scripts/perf-diff.mjs` + `api/perf.baseline.json`** — committed-baseline diff pattern; the
  improvement posts through it (report-only).
- **The `src/internal/` chokepoint controllers** (`floating-position.ts`, `option-filter.ts`) — tuning
  one shared file propagates to all its hosts, keeping edits small and off the frozen CEM surface.
- **`08-PATTERNS.md`** — a ready per-file map of what data-grid/combobox/controller/lazy-load already
  look like post-Phase-8; start there rather than re-deriving.

### Established Patterns
- **Memoize-by-identity inside the component** is the idiom for both D-01 and D-02 — clone/sort/filter
  only when the source identity or the sort/filter key changes; reuse otherwise.
- **Host-gated lifecycle preserved** — the controller's autoUpdate open-gating + `_startToken`
  close-during-load guard are Phase-8 invariants; churn reduction must not weaken them.
- **Gate on counts, report wall-clock** — the v1.1 discipline; report-only → enforcing flip is Phase 11.
- **Browser lane is the true regression gate** for anything touching overlay positioning or the
  virtualizer (Phase-8 lesson: jsdom + per-plan worktree self-checks passed while the browser lane
  had real cross-plan failures). Run `npm run test:browser` on every overlay/virtualizer change.

### Integration Points
- New **a11y-name/role snapshot** specs slot into `test/browser/**` next to `a11y.browser.test.ts` (report-only).
- The **CR-01 fix** in `lazy-load.ts` is exercised by the browser cold-load specs (via `__resetLazyLoadCachesForTest()`).
- No new files on the public surface; no `.size-limit.json` / `vite.config.ts` `external` changes
  (the frozen array is byte-snapshot-guarded — do not touch it).

</code_context>

<specifics>
## Specific Ideas

- The three targets are **already characterized** in `.planning/codebase/CONCERNS.md`
  (data-grid full render, combobox filter-per-keystroke, floating-ui autoUpdate churn) — Phase 9
  is executing the fixes that audit predicted.
- **Behavior-preserving is the hard constraint**, chosen over the faster-but-observable options at
  every fork: memoize the redundant work, never change *when* things visibly happen (no debounce,
  no reposition-frequency change users can perceive).
- The overlay tuning's blast radius is **all 6 overlays** (shared controller) — the browser lane +
  a11y snapshots are the safety net that makes that acceptable.
- CR-01 is a **pre-ship Critical**, not a nice-to-have; folding it here (D-05) is the cheapest way
  to retire it since Phase 9 already opens `lazy-load.ts`'s callers and runs the browser gate.

</specifics>

<deferred>
## Deferred Ideas

- **Deeper data-grid render-narrowing** (skip full re-render on selection/focus, not just memoize
  the sort) — deferred out of D-02 unless the baseline shows sort isn't the dominant cost. Revisit
  in-phase only if data warrants.
- **Debouncing combobox filter / `am-search`** — rejected under D-01 as behavior-observable
  (would need a Changeset); not pursued.
- **WR-02** (no-`0,0` reveal gate on tooltip/dropdown/combobox/select/color-picker) and **WR-03**
  (fire-and-forget `start()` unhandled rejections) — opportunistic alongside CR-01 (D-05), not
  required RPERF work; fix if cheap while in-file, else carry forward.
- **Flipping perf-count / size budgets to enforcing** → **Phase 11** (GATE-01/02/03); wall-clock
  stays report-only. This phase's win posts report-only.
- **`manualChunks` shared-runtime dedupe tuning** → `PERF-V2-01` (future), only if a chunk-graph
  duplication surfaces that deep-import purity can't resolve. Not a default.

None outside phase scope surfaced during discussion — the phase stayed on runtime tuning (with the
adjacent CR-01 Critical deliberately folded in).

</deferred>

---

*Phase: 9-runtime-performance-tuning*
*Context gathered: 2026-08-23*
</content>
</invoke>
