---
phase: 04-performance-feature-capabilities
plan: 09
subsystem: form-inputs
tags: [virtualization, performance, accessibility, combobox, select, aria-activedescendant, lit-labs]
status: complete
requires:
  - src/internal/helpers/virtualize-support.ts (VIRTUALIZE_ROW_THRESHOLD + ARIA helpers + scrollVirtualizerToIndex, from 04-08)
  - "@lit-labs/virtualizer virtualize() directive (external dep, added 04-08)"
  - src/components/combobox/combobox.ts (Phase-3 FIX-02/FIX-03 + Phase-4 04-04 validation / 04-07 autoUpdate wiring)
  - src/components/select/select.ts (same Phase-3/Phase-4 invariants)
provides:
  - am-combobox threshold-gated virtualize() option popup with stable option ids + aria-activedescendant (internal a11y wiring, freeze-neutral)
  - am-select threshold-gated state-driven virtualize() option popup (slotted am-option hidden above threshold) with the same a11y wiring
  - test/browser/combobox-virtual.test.ts (Chromium PERF-03 proof for both components)
affects:
  - src/components/combobox/combobox.ts
  - src/components/select/select.ts
tech-stack:
  added: []
  patterns:
    - "State-driven listbox virtualization with truthful ARIA (Pattern 3) extended to option popups"
    - "Stable per-option ids + aria-activedescendant with scroll-into-window-before-activedescendant (Pitfall 2)"
    - "am-select: flatten slotted am-option into a state model above the threshold; hide the slot, keep it present for queryAssignedElements/slotchange"
key-files:
  created:
    - test/browser/combobox-virtual.test.ts
  modified:
    - src/components/combobox/combobox.ts
    - test/components/combobox.test.ts
    - src/components/select/select.ts
    - test/components/select.test.ts
decisions:
  - "D-06 activation model reused: popups virtualize once option count > VIRTUALIZE_ROW_THRESHOLD (100); no new public attribute (freeze-neutral)"
  - "Combobox applies the option ARIA (id/setsize/posinset/selected) to BOTH the repeat() and virtualize() paths so behavior is uniform and jsdom-provable on small lists"
  - "am-select virtualization renders state-driven <div role=option> rows above the threshold and hides the slotted am-option projection (the virtualize() directive needs a data array, not slotted elements); the slot stays present so queryAssignedElements + slotchange keep working"
  - "Home/End/PageUp/PageDown added in the components (not in ListboxNavController) to keep FIX-02's no-re-clamp-on-replace untouched"
  - "aria-activedescendant is clamped to the rendered range WITHOUT re-clamping _highlightedIndex (FIX-02 preserved): a stale index yields no activedescendant instead of a dangling id"
  - "Reused 04-08's scrollVirtualizerToIndex (element(idx).scrollIntoView, A2 correction) — no scrollToIndex on the directive"
metrics:
  duration: ~40m
  completed: 2026-08-18
actuals:
  tokens: 11000
  tasks: 2
  commits: 2
---

# Phase 04 Plan 09: Combobox/Select Popup Virtualization (PERF-03) Summary

`am-combobox` and `am-select` option popups now virtualize automatically above the shared 100-option threshold (D-06, no new public attribute) via the `@lit-labs/virtualizer` `virtualize()` directive — introducing the stable per-option `id`s and `aria-activedescendant` the combobox never had, with `aria-setsize`/`aria-posinset` computed from the full filtered state and the target option scrolled into the window before `aria-activedescendant` references it, so keyboard navigation to off-screen options is truthful. Form-value integrity and the Phase-3 FIX-02 (no re-clamp on option replace) / FIX-03 (no focus-restoration regression) invariants are preserved, and both popups are proven in real Chromium.

## What Was Built

### Task 1 — Virtualized `am-combobox` popup with stable ids + aria-activedescendant (commit 0b29378)
- Added a shared `_renderOptionList(filtered)` that gates on `filtered.length > VIRTUALIZE_ROW_THRESHOLD`: at/below the threshold the existing `repeat()` path stands, above it the `virtualize()` directive windows the list (`keyFunction: (opt) => opt` identity). Both paths render through one `_renderOption(option, i, total)`, so the ARIA shape is identical.
- Each option now carries a deterministic index-based `id` (`_optionId(i)` off a per-instance `uniqueId` base), `aria-setsize` = the FULL filtered total from state (`ariaSetsize`), `aria-posinset` = absolute index + 1 (`ariaPosinset`), and `aria-selected=${this.value === option}` driven by state (never node presence). Applied to both the text-mode `.listbox` and the select-mode inner `.select-listbox`.
- `aria-activedescendant` is set on the input (text mode) / inner listbox (select mode) to the active option's id via `_activeDescendant(total)`, which clamps to the rendered range WITHOUT re-clamping `_highlightedIndex` — a transiently stale index (FIX-02) yields `nothing`, never a dangling id.
- Every highlight move routes through `_setHighlighted(index)`, which calls `scrollVirtualizerToIndex` on the active listbox host FIRST (mounting the target under the virtualizer) and then sets the index, so the subsequent render surfaces `aria-activedescendant` with the id already present. The shared `ListboxNavController.setIndex` callback was pointed at `_setHighlighted` (the controller itself is untouched — FIX-02).
- Added Home/End/PageUp/PageDown jumps in the component's `_handleKeydown` / `_handleDropdownSearchKeydown` (`_handleExtendedNav`), so nav to a far off-screen option is possible without adding keys to `ListboxNavController`.
- Extended `test/components/combobox.test.ts`: stable ids + full-total setsize/posinset, activedescendant tracks Arrow/Home/End nav, `aria-selected`/`setFormValue` driven by `value`, and a FIX-02 stale-index case where activedescendant stays absent while `_highlightedIndex` is untouched.

### Task 2 — Virtualized `am-select` popup + Chromium PERF-03 proof (commit 41a847f)
- `am-select` renders **slotted `am-option` custom elements**, not a string array — so the `virtualize()` directive (which needs a data array) cannot window the slotted nodes directly. Above the threshold the component flattens the slotted options into a state model (`SelectOptionModel { value, label, disabled }`), renders windowed `<div role="option" class="v-option">` rows from it, and hides the slotted projection (`.options-hidden`) while keeping the `<slot>` present so `@queryAssignedElements` + `slotchange` keep working. Below the threshold the existing slot-projection path is unchanged.
- Same a11y wiring as combobox: stable ids, `aria-setsize` (full model total) / `aria-posinset` (absolute index), `aria-activedescendant` on the listbox, `aria-selected` from `this.value`, and scroll-into-window-before-activedescendant via `_setHighlighted`.
- Preserved select's element-based **wraparound** keyboard nav (Arrow wraps end↔start, skipping disabled) rather than swapping in combobox's clamp model: `_handleKeyDown` branches to `_handleVirtualKeyDown` above the threshold, with `_moveVirtualHighlight` (±1 wrap), `_highlightEdge` (Home/End), and `_pageVirtualHighlight` (PageUp/PageDown). Selection commits through the extracted `_commitValue(value)` shared with the slotted `am-change` path.
- Extended `test/components/select.test.ts` (jsdom): the threshold branch flips and hides the slot above 100 options, `aria-activedescendant` tracks the highlighted index (state-driven), a FIX-02 stale-index case, and ArrowUp-wraps-to-last. (The virtualizer does not window rows in jsdom — layout is mocked — so windowed row ARIA is proven in the browser lane.)
- Created `test/browser/combobox-virtual.test.ts` (Chromium, both components, 1000 options): only a windowed subset (<200) mounts, every rendered option reports the full-total `aria-setsize=1000`, pressing End scrolls the last option into the DOM and sets `aria-activedescendant` to an id that resolves to a LIVE `role="option"` node (`Option 999` / `Opt 999`), and selecting that far virtualized option preserves the form value through native `ElementInternals` (`new FormData(form)` sees `Option 999` / `v999`).

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Type safety | `npx tsc --noEmit` | PASS (exit 0) |
| Combobox + select jsdom | `npm test -- --run combobox select` | PASS (78 tests, 3 files) |
| PERF-03 browser proof | `npm run test:browser -- --run combobox-virtual` | PASS (6 tests) |
| FIX-02 preserved | `git diff --stat src/internal/controllers/listbox-nav.ts` | empty (unchanged) |
| No new public attribute | `@property` count combobox 14 / select 14 (unchanged) | PASS |
| No `<lit-virtualizer>` element | `grep lit-virtualizer src/components/{combobox,select}` | none |

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality] am-select needed a state-model virtualization path (slotted options can't feed the directive).**
- **Found during:** Task 2 read of `select.ts`.
- **Issue:** The plan described "the same PERF-03 treatment" as combobox, but `am-select` projects consumer `<am-option>` elements through a `<slot>`; the `virtualize()` directive windows a data array, not slotted light-DOM nodes.
- **Fix:** Above the threshold, flatten the slotted options into a `SelectOptionModel[]` and render windowed `<div role="option">` rows from state, hiding (but keeping) the slot. This is the only way to virtualize while keeping selection/ARIA state-driven (Pitfall 2). Documented as a decision; below-threshold behavior and the slotted API are unchanged.

**2. [Rule 2 - Missing critical functionality] Added Home/End/PageUp/PageDown nav keys.**
- **Found during:** Both tasks — the must-have truth and browser acceptance require navigating to a far off-screen option (End), but `ListboxNavController` only owns Arrow/Enter/Escape/Tab and must stay untouched (FIX-02).
- **Fix:** Implemented the extended nav keys in the components (never in the controller), routing through `_setHighlighted` so scroll-into-window-before-activedescendant holds for them too.

## Threat Model Coverage

- **T-04-20 (XSS via virtualized option content):** mitigated — `renderItem`/`_renderVirtualOption` use Lit text bindings only (`${option}` / `${o.label}`); no raw-HTML sink.
- **T-04-21 (aria-activedescendant → unmounted id):** mitigated — `_setHighlighted` scrolls the target into the window before the render surfaces `aria-activedescendant`, and `_activeDescendant` clamps to the rendered range; the browser test asserts the referenced id resolves to a live node.
- **T-04-22 (form-value desync under recycling):** mitigated — `setFormValue`/`aria-selected` are driven by `this.value`, never option-node presence; the browser test submits a form and checks `FormData` after selecting a virtualized-out option.

## Known Stubs

None — both popups are fully wired to real state (options, value, highlight) and proven windowing + keyboard nav + form value in the browser lane.

## Notes for Downstream Plans

- The combobox/select option ARIA (`id` + `aria-setsize`/`aria-posinset` + `aria-activedescendant`) is now the reference pattern for any future virtualized listbox surface (e.g. `am-command-palette`, `am-menu`) — reuse `virtualize-support.ts` and the scroll-before-activedescendant ordering.
- `am-select` above the threshold renders state-model rows instead of the slotted `am-option` custom elements, so per-option custom slotted content (icons/badges inside `<am-option>`) is not shown for 1000+ option lists; documented tradeoff for the performance path (below threshold is unchanged).

## Self-Check: PASSED
- FOUND: src/components/combobox/combobox.ts
- FOUND: src/components/select/select.ts
- FOUND: test/browser/combobox-virtual.test.ts
- FOUND: commit 0b29378
- FOUND: commit 41a847f
