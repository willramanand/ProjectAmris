---
phase: 02-api-cleanup-cem-baseline
plan: 07
subsystem: ui
tags: [lit, reactive-controller, floating-ui, web-components, refactor, select, date-picker]

# Dependency graph
requires:
  - phase: 02-06
    provides: "src/internal/ boundary with FloatingPositionController, ListboxNavController, option-filter pure module (combobox reference consumer)"
  - phase: 02-04
    provides: "select am-change selection event (am-select-option -> am-change rename)"
provides:
  - "select delegates dropdown positioning to the shared FloatingPositionController (inline computePosition/autoUpdate removed)"
  - "date-picker delegates dropdown positioning to FloatingPositionController"
  - "src/internal/helpers/date-utils.ts — pure date-math module (daysInMonth/parseDate/formatDate/clampDay) consumed by date-picker"
affects: [02-08, phase-3-fixes, phase-4-perf]

# Actuals (#2632)
actuals:
  tokens: 9000
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Floating consumer delegates positioning to shared FloatingPositionController via a field-initializer + start()/stop() in updated()"
    - "Component-specific pure date math extracted to a plain ESM helper module under src/internal/helpers/ (D-07)"

key-files:
  created:
    - src/internal/helpers/date-utils.ts
  modified:
    - src/components/select/select.ts
    - src/components/date-picker/date-picker.ts

key-decisions:
  - "Delegated only genuinely-shared machinery: select + date-picker positioning maps byte-identically onto FloatingPositionController; select's element-based wraparound keyboard nav is component-specific and kept inline (D-08 'leave component-specific logic inline'; research A3 discretion)."
  - "select has NO option filtering (it navigates slotted <am-option> elements, not a text-filtered string list), so nothing was delegated to the option-filter unit."
  - "No shared controller files were modified — combobox is untouched and provably safe (the three Plan-06 units were consumed as-is, not edited)."

patterns-established:
  - "Floating positioning delegation: field-initializer FloatingPositionController with the host's exact reference/floating accessors + options; start()/stop() gated in updated() on the open state; teardown mirrored in hostDisconnected."
  - "Pure date-math helper module (no ReactiveController, no DOM/instance state) for logic that has nothing to hook into the host update cycle (D-07)."

requirements-completed: [API-03]

coverage:
  - id: D1
    description: "select delegates dropdown positioning to the shared FloatingPositionController, behavior-preserving (inline computePosition/autoUpdate removed, autoUpdate ungated)."
    requirement: "API-03"
    verification:
      - kind: unit
        ref: "test/components/select.test.ts (jsdom, 22 tests) — unchanged"
        status: pass
      - kind: unit
        ref: "test/components/combobox.test.ts (jsdom, 18 tests) — unchanged, shared controller untouched"
        status: pass
    human_judgment: false
  - id: D2
    description: "date-picker delegates positioning to FloatingPositionController and its date math to the pure src/internal/helpers/date-utils.ts module, behavior-preserving."
    requirement: "API-03"
    verification:
      - kind: unit
        ref: "test/components/date-picker.test.ts (jsdom, 9 tests incl. TEST-05 listener teardown) — unchanged"
        status: pass
    human_judgment: false
  - id: D3
    description: "Refactor is behavior-preserving across the full suite and the public surface is unchanged (CEM tagName set constant, src/internal non-exported)."
    requirement: "API-03"
    verification:
      - kind: integration
        ref: "npm run test:run (jsdom + Chromium) — 481 tests, 73 files pass, zero test edits"
        status: pass
      - kind: other
        ref: "npm run diff:surface — 'No surface drift'; exit 0; baseline unchanged"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-08-17
status: complete
---

# Phase 2 Plan 07: Select + Date-Picker onto Shared Internal Machinery Summary

**select and date-picker now delegate floating-ui dropdown positioning to the shared FloatingPositionController, and date-picker's date math lives in a pure src/internal/helpers/date-utils.ts module — behavior-preserving with the Phase 1 suite (jsdom + Chromium) green and zero test edits.**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-08-17
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Wired `am-select` onto `FloatingPositionController` with its exact options (`.trigger` reference, `.listbox` floating, bottom-start, fixed strategy, offset 4, `size` width-match middleware), removing the duplicated inline `computePosition`/`autoUpdate`/`_cleanupAutoUpdate` machinery and the direct `@floating-ui/dom` positioning imports.
- Wired `am-date-picker` onto `FloatingPositionController` (`.wrapper` reference, `.dropdown` floating, bottom-start, fixed, offset 4) and extracted its pure date math into `src/internal/helpers/date-utils.ts`.
- Proved behavior-preservation: full `npm run test:run` (481 tests across jsdom + Chromium) green with zero test edits; `diff:surface` reports no drift; CEM tagName set unchanged; `src/internal/` stays off barrels and `package.json` exports; no `innerHTML`/`eval` in `src/internal`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire select onto shared controller(s)** - `f2b5240` (refactor)
2. **Task 2: date-picker — FloatingPositionController + pure date-utils** - `83781a4` (refactor)
3. **Task 3: Behavior-preservation gate** - verification-only (no code change; baseline intentionally NOT re-committed)

## Files Created/Modified
- `src/internal/helpers/date-utils.ts` - pure ESM date-math module: `daysInMonth`, `parseDate`, `formatDate`, `clampDay`.
- `src/components/select/select.ts` - delegates positioning to FloatingPositionController; inline positioning removed.
- `src/components/date-picker/date-picker.ts` - delegates positioning to FloatingPositionController and date math to date-utils; inline positioning + inline date math removed.

## Decisions Made
- **Targeted delegation matched to real duplication (D-08 / research A3 discretion):** The genuinely-shared, byte-identical machinery between these components and combobox is the floating positioning — that is what was delegated. Select's keyboard navigation is a different interaction model (see deviation below) and was left inline per D-08's "leave component-specific logic inline."
- **Consumed the Plan-06 controllers as-is, edited none of them.** `files_modified` permitted touching the three controller files, but select's positioning options fit `FloatingPositionController`'s existing interface exactly, so no controller edits were needed. This guarantees combobox (and the future 02-08 ListboxNav consumer) are untouched — the strongest possible form of the "do not break combobox" prohibition.
- **`_daysInMonth` kept as a thin instance wrapper** delegating to the helper, so the several internal call sites (digit-input, segment-adjust) stay untouched while the arithmetic itself is now the pure module's.

## Deviations from Plan

The plan's must-haves and Task 1 acceptance criteria asked select to delegate **positioning, listbox keyboard nav, AND option filtering** to all three Plan-06 units. Executing against the real source showed that premise holds only for positioning. This is a Rule 4 (architectural) granularity call, resolved under discretion the phase RESEARCH explicitly grants (A3: "granularity is Claude's Discretion — let the green tests and real duplication decide"; D-08: "leave component-specific logic inline"; D-07).

**1. [Rule 4 - Architectural granularity] select nav kept inline; select filtering not applicable**
- **Found during:** Task 1 (reading `select.ts` vs `combobox.ts` + the three controllers)
- **Issue:** (a) `am-select` has **no option filtering** at all — it navigates slotted `<am-option>` **elements**, with no text-filter string list, so there is nothing to route through the `option-filter` unit. (b) `am-select`'s keyboard navigation is a genuinely different interaction model from combobox's `ListboxNavController`: it operates on `AmOption[]` DOM elements (not `string[]`), uses **wraparound** movement (not clamp), **opens on ArrowDown→first / ArrowUp→last**, handles **Space** to open, drives `.highlighted` attribute sync + `scrollIntoView`, and manages trigger focus on Escape/Tab. Forcing it through the shared controller would require 4+ gated behavioral forks (`wrap`, `activateOnSpace`, open-on-arrow, element-vs-string options, a post-move side-effect hook) — each a regression risk to combobox's AND select's green tests, and exactly the over-abstraction D-08/A3 caution against.
- **Fix / decision:** Delegated select's **positioning** to `FloatingPositionController` (the real, byte-identical shared machinery, mirroring combobox). Left select's element-based wraparound keyboard nav **inline** as component-specific logic. Did not invent filtering that does not exist.
- **Why this honors the plan's true intent:** The supreme, 4×-stated constraint (D-10) is behavior-preservation with zero test edits — this path guarantees it and keeps the shared controller clean for its real consumers. The primary D-08 goal (extract genuine shared machinery) is met via positioning.
- **Files modified:** src/components/select/select.ts
- **Verification:** `npx tsc --noEmit` clean; `test/components/select.test.ts` + `test/components/combobox.test.ts` green (40 tests), both test files unchanged; full suite 481 green; `grep -rnE "innerHTML|eval\(" src/internal` zero hits.
- **Committed in:** f2b5240

**2. [Note — date-picker scope] "calendar-grid generation" lives in `<am-calendar>`, not date-picker**
- **Found during:** Task 2
- **Issue:** The plan referenced extracting date-picker's "calendar-grid generation + date math." date-picker delegates grid rendering to the separate `<am-calendar>` component (not in `files_modified`); the pure logic actually present in date-picker is the date **math**.
- **Fix / decision:** Extracted the genuinely-pure date-math functions (`daysInMonth`, `parseDate`, `formatDate`, `clampDay`) into `date-utils.ts`. Did not touch `am-calendar` (out of scope).
- **Files modified:** src/components/date-picker/date-picker.ts, src/internal/helpers/date-utils.ts
- **Verification:** `test/components/date-picker.test.ts` green (9 tests) unchanged; tsc clean.
- **Committed in:** 83781a4

---

**Total deviations:** 2 (1 architectural granularity decision, 1 scope clarification) — both resolved under research-granted discretion (A3/D-07/D-08). No scope creep; the supreme behavior-preservation constraint (D-10) held throughout.
**Impact on plan:** `must_haves.truths[0]` ("select delegates positioning, listbox keyboard nav, and option filtering") is met for positioning only; nav is intentionally inline and filtering is N/A for select's actual shape. All automated `<verify>` gates pass; surface unchanged; combobox untouched.

## Issues Encountered
None — both refactors landed cleanly on the first pass with all gates green.

## Known Stubs
None. No hardcoded empty values, placeholder text, or unwired data sources were introduced. `_daysInMonth` remains a thin (intentional) wrapper delegating to the pure helper.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02-08 (which reuses `ListboxNavController`) can proceed: this plan did NOT modify any controller file, so there is no parallel-edit hazard on `listbox-nav.ts` and no combobox regression risk to reconcile.
- Phase 3 (FIX-02 listener/focus seams) and Phase 4 (PERF-04 autoUpdate gating) seams are preserved untouched — `autoUpdate` remains ungated in the shared controller; date-picker's document-listener teardown (TEST-05) is unchanged.
- Two of the Big-4 floating refactors are now on the shared seam (combobox from 02-06, select + date-picker here).

---
*Phase: 02-api-cleanup-cem-baseline*
*Completed: 2026-08-17*

## Self-Check: PASSED
- FOUND: src/internal/helpers/date-utils.ts
- FOUND: src/components/select/select.ts
- FOUND: src/components/date-picker/date-picker.ts
- FOUND: .planning/phases/02-api-cleanup-cem-baseline/02-07-SUMMARY.md
- FOUND commit: f2b5240 (Task 1)
- FOUND commit: 83781a4 (Task 2)
