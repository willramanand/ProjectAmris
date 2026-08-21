---
phase: 01-test-coverage-ci-gates-foundation
plan: 07
subsystem: testing
tags: [vitest, jsdom, lifecycle, spies, index-clamp, listener-teardown, overlays]

# Dependency graph
requires:
  - "01-01 (jsdom Vitest project, shared mock-free helpers, waitForUpdate)"
provides:
  - "TEST-04 jsdom coverage: highlighted-index stays within bounds after async/dynamic option replacement (combobox, select, rich-select)"
  - "TEST-05 jsdom coverage: document-level listener attach-on-open / detach-on-close / detach-on-disconnect spies (combobox, dropdown, context-menu, date-picker, popover)"
  - "Documented tooltip finding: no document-level listeners (scoped mouse/focus + floating-ui autoUpdate)"
affects: [01-08]

actuals:
  tokens: 6000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "vi.spyOn(document,'addEventListener'/'removeEventListener') + captured private handler ref asserts attach-on-open / detach-on-close and a balanced cycle"
    - "Set @state _highlightedIndex directly (reactive accessor triggers update); assert observable DOM highlight bound after options shrink — green-on-arrival (D-05)"
    - "Drive disconnect via el.remove() to assert disconnectedCallback listener teardown"

key-files:
  created: []
  modified:
    - test/components/combobox.test.ts
    - test/components/select.test.ts
    - test/components/rich-select.test.ts
    - test/components/dropdown.test.ts
    - test/components/context-menu.test.ts
    - test/components/date-picker.test.ts
    - test/components/popover.test.ts
    - test/components/tooltip.test.ts

key-decisions:
  - "Assert observable DOM highlight bound (rendered .option.highlighted index < options.length), not raw _highlightedIndex, so the suite stays green on current un-clamped code (D-05)"
  - "Set _highlightedIndex via its reactive accessor rather than key-navigation for deterministic 'near-end' setup"
  - "tooltip: assert the real behavior (no document listeners) instead of authoring a red assertion for an assumed document listener"

requirements-completed: [TEST-04, TEST-05]

coverage:
  - id: D1
    description: "combobox/select/rich-select: replacing options with a much shorter array while open (incl. rapid successive replacement) leaves no out-of-bounds highlighted option and no stale options (TEST-04)"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "vitest run --project jsdom {combobox,select,rich-select}.test.ts — 51 pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "combobox/dropdown/context-menu/date-picker/popover: document listener attach-on-open, detach-on-close, balanced cycle, and detach-on-disconnect via spies (TEST-05)"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "vitest run --project jsdom over the 5 files — pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "tooltip: asserts real current behavior — no document-level click/keydown listeners across a show/hide cycle (finding, not a leak)"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "tooltip.test.ts — am-tooltip listener lifecycle — pass"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 07: jsdom option-clamp + listener-teardown suites Summary

**Fast jsdom lifecycle/logic coverage for the two fragile overlay areas — async/dynamic option-update index clamping (TEST-04) across combobox/select/rich-select, and document-level listener attach/detach spies (TEST-05) across combobox/dropdown/context-menu/date-picker/popover — all green on existing code, with the un-clamped raw index and tooltip's listener-free model captured as Phase 3 findings.**

## Performance

- **Duration:** ~4 min
- **Tasks:** 3
- **Files modified:** 8 (all existing dedicated jsdom test files)
- **Tests added:** 20 new `it` cases (86 total pass across the 8 files)

## Accomplishments
- **TEST-04 (Task 1):** Added clamp-after-replacement assertions to `combobox`, `select`, and `rich-select`. Each opens the listbox, sets the highlighted index near the end of a large option set, then replaces `options` (property array for combobox/rich-select; slotted `<am-option>` children for select) with a much shorter set — including a rapid double-replacement variant — and asserts no rendered option is highlighted out of range and that stale options do not linger.
- **TEST-05 (Tasks 2 & 3):** Added `vi.spyOn(document, …)` teardown assertions for the five overlays that use document-level listeners. Each captures the component's private handler reference, opens the component and asserts `addEventListener` was called with that handler, closes it and asserts the matching `removeEventListener`, checks a balanced cycle where applicable, and drives `el.remove()` to assert `disconnectedCallback` teardown.
- **tooltip finding (Task 3):** Documented and asserted `am-tooltip`'s actual model — it attaches no document-level listeners, using element-scoped `mouseenter/leave/focusin/out` on the shadow trigger plus floating-ui `autoUpdate` (cleaned up on hide). The test asserts the absence of any document `click`/`keydown` listener across a show/hide cycle rather than an assumed leak.

## Task Commits

1. **Task 1 — async option-update index clamp (TEST-04)** — `625e707` (test) — combobox, select, rich-select
2. **Task 2 — document listener teardown spies (TEST-05)** — `07dba9f` (test) — combobox, dropdown, context-menu
3. **Task 3 — document listener teardown spies (TEST-05)** — `4b13072` (test) — date-picker, popover, tooltip

## Files Modified
- `test/components/combobox.test.ts` — clamp describe (TEST-04) + document-click teardown describe (TEST-05)
- `test/components/select.test.ts` — slotted-option clamp describe (TEST-04)
- `test/components/rich-select.test.ts` — RichOption[] clamp describe (TEST-04)
- `test/components/dropdown.test.ts` — click+keydown teardown describe (TEST-05)
- `test/components/context-menu.test.ts` — click+keydown+contextmenu teardown describe (TEST-05)
- `test/components/date-picker.test.ts` — document-click teardown describe (TEST-05)
- `test/components/popover.test.ts` — click+keydown teardown describe (TEST-05)
- `test/components/tooltip.test.ts` — listener-lifecycle describe documenting the no-document-listener model (TEST-05)

## Decisions Made
- **Assert observable DOM bound, not raw state.** The three clamp components do not re-clamp their `@state _highlightedIndex` when `options` changes, so an assertion on the raw index would be red. The render layer only produces `[0, len-1]` option nodes, so the tests assert the rendered `.option.highlighted` index stays `< options.length` — the real user-visible guarantee — keeping the suite green-on-arrival (D-05).
- **Direct reactive-accessor setup.** `_highlightedIndex` is set through its Lit `@state` accessor (which schedules an update) to place the highlight "near the end" deterministically, avoiding brittle key-navigation sequences.
- **Capture, do not fix.** No component source was modified; the un-clamped raw index and tooltip's listener model are recorded as Phase 3 (FIX-02) findings.

## Deviations from Plan

None affecting scope. The plan's Task 3 assumed every listed overlay attaches a document-level listener; `am-tooltip` does not. Per D-05 this was handled by asserting the component's real behavior and recording a finding (see below) rather than authoring a red assertion — exactly the green-on-arrival path the plan prescribes.

## Findings (captured for Phase 3 FIX-02 — not fixed here)

1. **Un-clamped highlighted index on option replacement (TEST-04 components).** `am-combobox` (sync mode), `am-select`, and `am-rich-select` do not reset/clamp their internal `_highlightedIndex` when the option set is replaced while open — the stored index can remain past the new end. There is **no observable defect** because the render layer never emits an out-of-range highlighted node, but the stale internal index is a latent risk (e.g. a subsequent Enter/select path that reads the index). Owning phase: Phase 3 FIX-02.
   - `combobox.ts` `updated()` only resets `_highlightedIndex` in the `async && focused` branch (line ~377); sync-mode option replacement leaves it untouched.
   - `rich-select.ts` `updated()` (line ~254) does not touch `_highlightedIndex` on `options` change.
   - `select.ts` `updated()` (line ~443) does not touch `_highlightedIndex` on slot change.
2. **tooltip has no document-level listener teardown surface (TEST-05).** `am-tooltip` never calls `document.addEventListener`; visibility is driven by shadow-scoped `mouseenter/leave/focusin/out` and floating-ui `autoUpdate` (torn down in `_handleLeave`/`disconnectedCallback`). The TEST-05 "document listener attach/detach" shape is therefore N/A for tooltip; there is no document-listener leak. Recorded so Phase 3 does not treat the absence as a missing mitigation.

## Known Stubs
None — all new assertions exercise real components and real event lifecycles; no placeholder/empty-data stubs introduced. No component source changed.

## Threat Flags
None — test-only changes, no new runtime surface, no new dependencies. Honors threat register T-01-07a/b (green-on-arrival; leak/clamp temptations captured as findings, not fixed).

## Self-Check: PASSED
- All 8 modified test files present and pass under `vitest run --project jsdom` (86 tests).
- All 3 task commits (625e707, 07dba9f, 4b13072) exist in git history.

---
*Phase: 01-test-coverage-ci-gates-foundation*
*Completed: 2026-08-11*
