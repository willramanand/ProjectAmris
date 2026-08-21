---
phase: 04-performance-feature-capabilities
plan: 08
subsystem: data-display
tags: [virtualization, performance, accessibility, data-grid, lit-labs]
status: complete
requires:
  - "@lit-labs/virtualizer virtualize() directive (external dep)"
  - src/components/data-grid/data-grid.ts (existing table/repeat render path)
provides:
  - src/internal/helpers/virtualize-support.ts (VIRTUALIZE_ROW_THRESHOLD + ARIA helpers + scrollVirtualizerToIndex)
  - am-data-grid threshold-gated div-grid virtualized render path (internal, freeze-neutral)
affects:
  - vite.config.ts (external list += /^@lit-labs\//)
  - package.json (dependencies += @lit-labs/virtualizer@2.1.1)
tech-stack:
  added:
    - "@lit-labs/virtualizer@2.1.1 (exact-pin, external/unbundled)"
  patterns:
    - "State-driven virtualization with truthful ARIA (Pattern 3)"
    - "Div-grid render path above threshold instead of native <table> (Pitfall 1)"
    - "Identity keyFunction (getRowId) so selection/sort/focus survive row recycling"
key-files:
  created:
    - src/internal/helpers/virtualize-support.ts
    - test/browser/virtualize-smoke.test.ts
    - test/browser/data-grid-virtual.test.ts
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts
    - src/components/data-grid/data-grid.ts
decisions:
  - "D-07: VIRTUALIZE_ROW_THRESHOLD = 100 (documented per-row DOM cost basis)"
  - "A2 CORRECTED: virtualize() directive has no scrollToIndex; use host[virtualizerRef].element(idx).scrollIntoView() (scrollToIndex is a <lit-virtualizer>-only shim)"
  - "Div-grid uses role=grid/rowgroup/row so table ARIA transfers (Pitfall 1)"
  - "width:100% + scrollbar-gutter:stable on header+body keep columns aligned under the virtualizer's absolute positioning"
metrics:
  duration: ~35m
  completed: 2026-08-18
actuals:
  tokens: 7679
  tasks: 2
  commits: 2
---

# Phase 04 Plan 08: am-data-grid Virtualization Summary

`am-data-grid` now virtualizes 1000+ rows via the `@lit-labs/virtualizer` `virtualize()` directive, auto-activating above a documented 100-row threshold (D-05, no new public attribute) through a div-based grid render path with truthful state-driven ARIA and identity-keyed selection/sort/focus that survive DOM recycling — internal-only, freeze-neutral, virtualizer kept external and exact-pinned.

## What Was Built

### Task 1 — `@lit-labs/virtualizer` (external) + `virtualize-support` helper (commit a95f61c)
- Added `@lit-labs/virtualizer` exact-pinned at `2.1.1` to `package.json` `dependencies` (D-13; pre-1.0/labs can break on a minor bump) and `/^@lit-labs\//` to the `vite.config.ts` external list so it stays unbundled (D-12). Confirmed external: the built `data-grid` chunk keeps a bare `import ... from "@lit-labs/virtualizer/virtualize.js"` and none of the virtualizer's source (`ScrollerController`, `_hostElementRO`) is inlined into `dist/`.
- **Verified the v2.1.1 runtime API against the installed package (A1–A4):**
  - **A1 CONFIRMED** — the `virtualize()` directive calls `renderItem(item, idx)` with the ABSOLUTE index: `renderItem(item, idx + this._first)` (`virtualize.js:62`). ARIA position math needs no window offset.
  - **A2 CORRECTED** — the directive has **no** `scrollToIndex()`. That method exists only on the `<lit-virtualizer>` element as a legacy shim (`LitVirtualizer.d.ts:21-24`). For the directive, scroll-to is `hostEl[virtualizerRef]?.element(idx)?.scrollIntoView(options)` (README:192-208, 300-306). Encapsulated in `scrollVirtualizerToIndex()`.
  - **A3 CONFIRMED** — import path `@lit-labs/virtualizer/virtualize.js` (also re-exports `virtualizerRef`).
  - **A4 CONFIRMED** — default `flow` layout auto-measures child heights via `ResizeObserver`; no explicit layout/`itemSize` config. Requires block-level children.
- Created `src/internal/helpers/virtualize-support.ts` (non-exported, on the `src/internal/` boundary; never re-exported from `src/index*.ts`): `VIRTUALIZE_ROW_THRESHOLD = 100` with a documented cost basis (per-row `(columns+1)` gridcells plus a nested `am-checkbox` shadow root; ~100 rows is where a full re-render on sort crosses a ~16ms frame budget), pure ARIA helpers `ariaPosinset`/`ariaSetsize`/`ariaRowindex`, and `scrollVirtualizerToIndex`.
- Created `test/browser/virtualize-smoke.test.ts` (Chromium) proving windowed DOM subset + full logical count in state + `element(idx).scrollIntoView()` bringing a far index into the DOM — de-risking the labs API before the grid depends on it.

### Task 2 — Virtualized `am-data-grid` div-grid path (commit 6cd6a2b)
- `render()` gates on `this.rows.length > VIRTUALIZE_ROW_THRESHOLD`: at/below the threshold the existing `<table>`/`repeat()` path (`_renderTable`) is untouched; above it `_renderVirtual` renders a div-grid (`role="grid"`/`"rowgroup"`/`"row"`/`"gridcell"`/`"columnheader"`) driven by the `virtualize()` directive over `_sortedRows`.
- Truthful ARIA from state: `aria-rowcount = this.rows.length` (full total), each row's `aria-rowindex = ariaRowindex(absIndex)` (1-based incl. header offset) from the absolute index.
- Identity-keyed via `keyFunction = getRowId(row, originalIndex)` so selection (`_selectionSet.has(id)`), sort, and roving focus (`_focusedRowIndex`) survive recycling. `_focusRowAt` scrolls a target row into the DOM **before** focusing it (never focuses an unmounted row — FIX-03 preserved).
- Layout correctness: `width:100%` on rows (the flow layout positions rows absolutely, which would otherwise shrink them to content width) plus `scrollbar-gutter: stable` on both header and body so column tracks resolve against the same content width and stay aligned.
- JSDoc documents the mobile screen-reader recycled-row limitation (documented, not worked around). No editable/sortable spreadsheet features added (FEAT-V2-02 stays deferred). Cell content is text bindings only (no raw-HTML sink — T-04-18 mitigated).
- Created `test/browser/data-grid-virtual.test.ts` (Chromium): div-grid not `<table>`, full-total `aria-rowcount`, per-row `aria-rowindex`, windowed DOM, selection survives scroll-out-and-back, and non-zero row height with header/body columns aligned.

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Type safety | `npx tsc --noEmit` | PASS (exit 0) |
| Build (virtualizer external) | `npm run build` | PASS; virtualizer not bundled |
| Below-threshold path unchanged | `npm test -- --run data-grid` | PASS (11 tests) |
| Labs API de-risk | `npm run test:browser -- --run virtualize-smoke` | PASS (2 tests) |
| Virtualized grid | `npm run test:browser -- --run data-grid-virtual` | PASS (4 tests) |
| Exact pin | `dependencies["@lit-labs/virtualizer"] === "2.1.1"` | PASS |
| No new public attribute | `@property` count on data-grid unchanged (9) | PASS |
| No `<lit-virtualizer>` element | only doc-comment citations | PASS |

## Deviations from Plan

**1. [Rule 1 - API correction] `scrollToIndex` is not on the `virtualize()` directive (A2).**
- **Found during:** Task 1 API verification.
- **Issue:** The plan/RESEARCH assumed `virtualizerRef + .scrollToIndex(index, position)` as the directive scroll-to API. In v2.1.1 `scrollToIndex` exists only on the `<lit-virtualizer>` element (a backwards-compat shim); the directive exposes `host[virtualizerRef].element(idx).scrollIntoView(options)`.
- **Fix:** Implemented `scrollVirtualizerToIndex()` using the `element(idx).scrollIntoView()` proxy, documented the correction in the helper and this summary. No `<lit-virtualizer>` element introduced (would violate D-05/prohibitions).

**2. [Rule 1 - Layout bug] Virtualized rows shrank to content width and columns misaligned.**
- **Found during:** Task 2 browser test (`gridTemplateColumns` header 187px vs data row 50.2px).
- **Issue:** The flow layout positions body rows absolutely, so `minmax(0,1fr)` tracks resolved against each row's shrink-to-fit width instead of the container; a scrollbar gutter mismatch also offset header vs body.
- **Fix:** Added `width:100%` to `.grid-row` and `scrollbar-gutter: stable` to both `.grid-header` (via `overflow-y:hidden`) and `.grid-body`, making header/body columns align exactly. Verified by the alignment assertion.

## Threat Model Coverage

- **T-04-18 (XSS via virtualized cell content):** mitigated — `renderItem` uses Lit text bindings only (`${row[col.key] ?? ''}`); no raw-HTML sink.
- **T-04-SC (supply chain):** `@lit-labs/virtualizer` is a first-party lit/lit package, legitimacy OK, `postinstall` null (RESEARCH audit); exact-pinned `2.1.1` and kept external. No human-verify gate required.
- **T-04-19 (recycled-row ARIA counts):** mitigated — `aria-rowcount`/`aria-rowindex` computed from state/absolute index, never the DOM (Pitfall 2); browser test asserts truthful counts.

## Known Stubs

None — the virtualized render path is fully wired to real state (rows, selection, sort, focus) and proven in the browser lane.

## Notes for Downstream Plans

- `virtualize-support.ts` (`VIRTUALIZE_ROW_THRESHOLD`, `scrollVirtualizerToIndex`, ARIA helpers) is the shared seam for the combobox/select popup virtualization (PERF-03, plan 04-09): reuse the same threshold model (D-06) and the corrected `element(idx).scrollIntoView()` scroll-to (note A2) before setting `aria-activedescendant`.
- The virtualizer emits a benign `ResizeObserver loop completed with undelivered notifications` console message under test; it is non-fatal (all tests pass). `@lit-labs/virtualizer/support/resize-observer-errors.js` exists if a consumer wants to suppress it.

## Self-Check: PASSED
- FOUND: src/internal/helpers/virtualize-support.ts
- FOUND: test/browser/virtualize-smoke.test.ts
- FOUND: test/browser/data-grid-virtual.test.ts
- FOUND: commit a95f61c
- FOUND: commit 6cd6a2b
