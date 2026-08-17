---
phase: 02-api-cleanup-cem-baseline
plan: 04
subsystem: api
tags: [web-components, lit, events, custom-elements-manifest, changesets, select, data-grid]

# Dependency graph
requires:
  - phase: 02-api-cleanup-cem-baseline
    provides: "Plan 01 CEM comparator (scripts/cem-diff.mjs) + committed baseline; Plan 02 api/AUDIT.md rename mapping; Plan 03 overlay-event rename wave pattern (one Changeset + baseline re-commit)"
provides:
  - "Selection events normalized under the D-02 change-vs-select split: am-select-option -> am-change (am-option), am-row-select + am-selection-change -> single am-change with detail { keys } (am-data-grid)"
  - "One wave Changeset .changeset/normalize-selection-events.md documenting the break and the data-grid { keys } detail shape"
  - "Re-committed api/custom-elements.baseline.json (79-element tagName set unchanged)"
affects: [02-05, 02-09, phase-06-freeze]

actuals:
  tokens: 9000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Value-changing controls emit am-change (native <select> vocabulary); discrete-pick controls keep am-select (D-02)"
    - "Multi-event selection APIs reconcile to one native-style value-change event carrying the aggregate value ({ keys })"

key-files:
  created:
    - .changeset/normalize-selection-events.md
  modified:
    - src/components/select/select.ts
    - src/components/data-grid/data-grid.ts
    - test/components/select.test.ts
    - test/components/data-grid.test.ts
    - api/custom-elements.baseline.json

key-decisions:
  - "data-grid am-change carries the aggregate selection set as detail { keys } (Option 'aggregate') — approved by coordinator; per-row + aggregate pair collapsed into one native-style value-change event"
  - "Old selection event names removed outright, no backward-compat alias (D-04)"

patterns-established:
  - "Selection-event normalization: rename dispatch string + internal self-wiring listener + @fires JSDoc + tests together so the component still self-wires"
  - "One Changeset per rename wave records old->new names and the frozen detail shape (D-05)"

requirements-completed: [API-02]

coverage:
  - id: D1
    description: "am-option (consumed by am-select) dispatches am-change with detail { value }, composed:false; internal listener self-wires am-change"
    requirement: "API-02"
    verification:
      - kind: unit
        ref: "test/components/select.test.ts#sets role=\"option\" and fires am-change on click"
        status: pass
      - kind: unit
        ref: "test/components/select.test.ts#selects an option and emits change"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-data-grid dispatches a single am-change value-change event with aggregate detail { keys }; old per-row + aggregate events removed; selection runtime logic unchanged"
    requirement: "API-02"
    verification:
      - kind: unit
        ref: "test/components/data-grid.test.ts#toggles selection on row click and emits am-change with the aggregate keys set"
        status: pass
      - kind: unit
        ref: "test/components/data-grid.test.ts#uses custom getRowId for selection identity"
        status: pass
    human_judgment: false
  - id: D3
    description: "Old selection event strings removed across src and test (grep zero hits); discrete-pick am-select on menu/list/tree-view/command-palette untouched; exactly one Changeset written"
    requirement: "API-02"
    verification:
      - kind: other
        ref: "grep -rnE 'am-select-option|am-row-select|am-selection-change' src test => zero hits"
        status: pass
      - kind: other
        ref: "git diff --name-only => only select/data-grid + their tests + changeset changed"
        status: pass
    human_judgment: false
  - id: D4
    description: "CEM baseline re-committed post-wave; diff:surface report-only shows only the intended selection renames; CEM tagName SET unchanged (79 elements)"
    requirement: "API-02"
    verification:
      - kind: other
        ref: "npm run diff:surface => exit 0, drift = am-data-grid/am-option am-change only"
        status: pass
      - kind: automated_ui
        ref: "npm run test:run (481 pass) + npm run test:browser (39 pass)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-17
status: complete
---

# Phase 2 Plan 4: Normalize Selection Events (am-change) Summary

**Selection vocabulary normalized under D-02: `am-option` and `am-data-grid` value-changes now emit `am-change` (native `<select>` semantics), with data-grid's per-row + aggregate pair collapsed into one `am-change` carrying `{ keys }` — one Changeset, baseline re-committed, full suite green.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-17T04:02:12Z
- **Completed:** 2026-08-17T04:06:39Z
- **Tasks:** 3 (1 checkpoint decision + 2 auto)
- **Files modified:** 5

## Accomplishments
- select: renamed the `am-select-option` dispatch to `am-change` (detail `{ value }` and `composed: false` preserved) and renamed the internal `add/removeEventListener` self-wiring so the component still binds itself; `@fires am-change` documented on `am-option`.
- data-grid: reconciled the per-row `am-row-select` (`{ row, index, id, selected, keys }`) and aggregate `am-selection-change` (`{ keys }`) into a single `am-change` value-change event carrying the aggregate selection set `{ keys }`; selection runtime logic (which rows select) untouched.
- One Changeset `.changeset/normalize-selection-events.md` records the break, old->new names, and the frozen data-grid detail shape (D-05). Old names removed outright — grep in src/test returns zero hits (D-04).
- Baseline re-committed (D-14); `diff:surface` report-only (exit 0) shows only the intended event drift; CEM tagName set unchanged at 79 elements.

## Task Commits

1. **Task 1: Approve selection rename + decide data-grid detail shape** — checkpoint:decision; coordinator approved `aggregate` (`{ keys }`). No commit (decision gate).
2. **Task 2: Rename selection events + listener + JSDoc + tests, one Changeset** — `2f20e2f` (feat)
3. **Task 3: Re-commit baseline + report-only diff + full suite** — `0e5fcac` (chore)

_Full suite: jsdom 481/481 pass, browser 39/39 pass._

## Files Created/Modified
- `.changeset/normalize-selection-events.md` - Wave Changeset (minor); old->new names + data-grid `{ keys }` detail shape.
- `src/components/select/select.ts` - `am-option` dispatch, internal listener, and `@fires` renamed to `am-change`.
- `src/components/data-grid/data-grid.ts` - single `am-change` dispatch (`{ keys }`), `@fires` + selection-prop JSDoc updated.
- `test/components/select.test.ts` - assertions updated to `am-change`.
- `test/components/data-grid.test.ts` - selection tests reconciled to a single `am-change` with `{ keys }`.
- `api/custom-elements.baseline.json` - re-committed post-wave snapshot.

## Decisions Made
- data-grid `am-change` carries the aggregate selection set `detail { keys }` (Option `aggregate`, coordinator-approved) — matches native value-change semantics (event reports the new value). Consumers that used per-row detail must diff the aggregate set (recorded in the Changeset).
- Old selection event names removed outright, no alias (D-04).

## Deviations from Plan
None - plan executed exactly as written. The approved detail shape (`aggregate` / `{ keys }`) was the planner's recommended option.

## Issues Encountered
- The baseline re-copy produced a large raw-JSON diff (symmetric ~4967/4967 lines). Investigation confirmed this is **not** a regression: the previous committed baseline was slightly stale w.r.t. non-custom-element style-utility modules (`src/styles/corners.css.ts`, `reset.css.ts`) that `cem analyze` now emits. The custom-element tagName SET is byte-for-byte identical (79 elements, verified by set diff), and `diff:surface` (which keys on element surface) reports only the intended `am-change` renames. Re-copying brings the baseline current per D-14 with no surface impact.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Two of the phase-02 rename waves (overlay lifecycle in 02-03, selection in 02-04) are now landed with baseline re-committed. Remaining rename/normalization waves (subsequent plans) can proceed against the current baseline.
- No blockers.

## Self-Check: PASSED

All created/modified files present on disk; task commits `2f20e2f` and `0e5fcac` exist in history.

---
*Phase: 02-api-cleanup-cem-baseline*
*Completed: 2026-08-17*
