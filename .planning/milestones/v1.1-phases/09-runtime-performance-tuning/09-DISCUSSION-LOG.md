# Phase 9: Runtime-Performance Tuning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 9-runtime-performance-tuning
**Areas discussed:** Filter work (combobox), Sort work (data-grid), Reposition churn (overlay), Proof & scope

---

## Filter work (combobox) — RPERF-02

| Option | Description | Selected |
|--------|-------------|----------|
| Memoize only | Compute filtered once per render, cache by (options,value); stop re-spreading `_allOptions`. Fully behavior-preserving. | ✓ |
| Memoize + debounce remote | Also debounce the `am-search` event in remote mode. Shifts observable event cadence — arguably a behavior change needing a Changeset. | |
| Memoize + debounce all | Debounce client filtering too. Largest cut but visibly changes when the list updates while typing. | |

**User's choice:** Memoize only
**Notes:** `filterOptions` runs 3×+ per keystroke on identical `(options,value)` (combobox lines 196/704/795/893/938); `_allOptions` re-spreads arrays each call. Debounce rejected as behavior-observable under the v1.0 surface-freeze.

---

## Sort work (data-grid) — RPERF-01

| Option | Description | Selected |
|--------|-------------|----------|
| Memoize sort only | Cache the sorted array by (rows,sortKey,sortDir) so non-sort re-renders reuse it. Smallest regression surface. | ✓ |
| Memoize + narrow render | Also avoid full re-render on selection/focus. Bigger win, more of the frozen render path to re-verify. | |
| You decide from baseline | Pick depth from what the Phase-7 baseline shows dominates. | |

**User's choice:** Memoize sort only
**Notes:** `_sortedRows` (line 392) re-clones + re-sorts on every `render()` — focus/selection/resize all re-sort. Deeper render-narrowing deferred unless the baseline says sort isn't the dominant cost.

---

## Reposition churn (overlay) — RPERF-03

| Option | Description | Selected |
|--------|-------------|----------|
| Shared controller, browser-gated | Reduce churn in the one shared `FloatingPositionController` (cache middleware / hoist static `resolve()`s; keep autoUpdate open-gating). Fixes all 6 overlays; validate on browser lane. | ✓ |
| One representative overlay | Scope to a single overlay to shrink regression surface; leave the other 5. Leaves most of the win unbanked. | |
| You decide technique | Shared controller, Claude picks the mechanism from the baseline. | |

**User's choice:** Shared controller, browser-gated
**Notes:** Churn is structural in `_updatePosition` (`floating-position.ts:146`) — rebuilds middleware + re-runs `resolve()` getters every autoUpdate tick. Blast radius = all 6 overlays, so the browser regression lane is the gate (jsdom mocks ResizeObserver/positioning). Preserve `_startToken` close-during-load guard.

---

## Proof & scope — RPERF-04 + carry-forward CR-01

| Option | Description | Selected |
|--------|-------------|----------|
| Fold CR-01 into Phase 9 | Fix the rejected-promise cache (null on reject → retry) as a rider. Phase 9 already re-touches `lazy-load.ts` callers + runs the browser gate. Behavior-preserving, no new API. | ✓ |
| Keep CR-01 separate | Phase 9 stays pure perf-tuning; fix CR-01 via `/gsd-quick` before v1.1 ship. | |
| Defer CR-01 decision | Note it; decide fold-vs-separate at ship time. | |

**User's choice:** Fold CR-01 into Phase 9
**Notes:** a11y-name/role snapshots (RPERF-04) confirmed to run on the **browser lane** (recommendation accepted — jsdom can't prove the positioned/windowed a11y tree). CR-01 is a pre-ship Critical from `08-REVIEW.md` sitting in the exact files this phase opens; folding retires it without a separate pass. Sibling advisory findings WR-02 / WR-03 flagged as opportunistic (not required RPERF work).

---

## Claude's Discretion

- Exact churn-reduction mechanism inside the shared controller (cache static middleware slice / hoist fixed-value `resolve()`s / coalesce repositions) — pick from baseline.
- Memoization shape for D-01/D-02 (instance field vs module-level; identity vs value-equality key).
- Which single overlay represents "overlay" for a11y snapshot + perf re-measure (reuse the Phase-7 perf-scenario overlay).
- Whether to re-capture the post-deferral perf baseline or diff against committed `api/perf.baseline.json`.
- Whether WR-02 / WR-03 get fixed alongside CR-01 (opportunistic).

## Deferred Ideas

- Deeper data-grid render-narrowing beyond memoizing the sort — only if baseline warrants.
- Debouncing combobox filter / `am-search` — rejected (behavior-observable, would need a Changeset).
- WR-02 (no-`0,0` reveal gate gaps) / WR-03 (fire-and-forget `start()` rejections) — opportunistic alongside CR-01.
- Flipping perf-count / size budgets to enforcing → Phase 11 (GATE-*).
- `manualChunks` shared-runtime dedupe → PERF-V2-01 (future), only if chunk-graph duplication surfaces.
