---
phase: 01-test-coverage-ci-gates-foundation
plan: 02
subsystem: testing
tags: [vitest, jsdom, smoke-tests, layout-primitives, test-split, 1-to-1-invariant]

# Dependency graph
requires:
  - "Hybrid Vitest jsdom project + split mechanic proven by 01-01 (misc-display split)"
provides:
  - "Dedicated 1:1 jsdom test files for stack, grid, surface, panel, card"
  - "Retired grouped test/components/layout-primitives.test.ts (1:1 invariant held)"
affects: [01-03, 01-04, 01-05, 01-06, 01-07, 01-08]

actuals:
  tokens: 3100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Verbatim describe-block lift into dedicated file with per-block minimal imports (noUnusedLocals-safe)"
    - "Grouped-file deletion only after all split targets pass (single-owner, race-free)"

key-files:
  created:
    - test/components/stack.test.ts
    - test/components/grid.test.ts
    - test/components/surface.test.ts
    - test/components/panel.test.ts
    - test/components/card.test.ts
  modified: []
  deleted:
    - test/components/layout-primitives.test.ts

key-decisions:
  - "Import only the helpers each block uses (stack keeps waitForUpdate for its dynamic direction prop; grid/surface/panel/card import fixture only) to satisfy noUnusedLocals"
  - "Deleted layout-primitives.test.ts only after all 5 dedicated files pass under the jsdom project (OQ-3, 1:1 invariant, race-free single owner)"

patterns-established:
  - "Split-verbatim-then-retire: dedicated 1:1 file per component, no assertion rewrite (Pitfall 1)"

requirements-completed: [TEST-01]

coverage:
  - id: D1
    description: "stack, grid, surface split into dedicated 1:1 jsdom files, blocks lifted verbatim (TEST-01, D-04 smoke)"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "vitest run --project jsdom test/components/{stack,grid,surface}.test.ts — 8 pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "panel (bordered + header/body slots + 3 part exposures) and card (default slot) split into dedicated files (TEST-01, D-04)"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "vitest run --project jsdom test/components/{panel,card}.test.ts — 4 pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "layout-primitives.test.ts retired with zero coverage loss; full jsdom project stays green (OQ-3, 1:1 invariant)"
    requirement: "TEST-01"
    verification:
      - kind: automated
        ref: "test ! -f layout-primitives.test.ts; vitest run --project jsdom — 53 files / 417 tests pass"
        status: pass
    human_judgment: false

duration: 1min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 02: Layout-Primitives Test Split Summary

**Split `test/components/layout-primitives.test.ts` into five dedicated 1:1 files (stack, grid, surface, panel, card) with every assertion lifted verbatim, then retired the grouped file — closing 5 of the 23 dedicated-file gaps with zero coverage loss and the full jsdom project green (53 files / 417 tests).**

## Performance

- **Duration:** ~1 min
- **Tasks:** 2
- **Files:** 5 created, 1 deleted

## Accomplishments
- Created `stack.test.ts`, `grid.test.ts`, `surface.test.ts` — each imports exactly one component barrel plus only the helpers its block uses; all three describe blocks lifted verbatim (stack retains its dynamic `direction` prop-update assertion, grid the auto-fill default, surface the default-variant assertion). 8 assertions preserved.
- Created `panel.test.ts` (bordered reflection, header/body named slots, and `part="header"`/`part="body"`/`part="panel"` exposures) and `card.test.ts` (default-slot assertion). 4 assertions preserved.
- Deleted `test/components/layout-primitives.test.ts` only after all 5 dedicated files passed (OQ-3, 1:1 invariant, race-free single owner).
- All five layout primitives now hold dedicated 1:1 `test/components/<name>.test.ts` files; the full `vitest run --project jsdom` stays green at 53 files / 417 tests.

## Task Commits

1. **Task 1: Split stack, grid, surface (D-04 smoke)** — `8e6152d` (test)
2. **Task 2: Split panel, card; retire grouped file (OQ-3)** — `cf8068b` (test)

## Files Created/Modified
- `test/components/stack.test.ts` — am-stack block (reflection, default slot, dynamic direction); imports `fixture`, `waitForUpdate`
- `test/components/grid.test.ts` — am-grid block (columns/gap reflection, auto-fill default, slot); imports `fixture`
- `test/components/surface.test.ts` — am-surface block (variant/bordered/flush reflection, default variant); imports `fixture`
- `test/components/panel.test.ts` — am-panel block (bordered, header/body slots, 3 part exposures); imports `fixture`
- `test/components/card.test.ts` — am-card block (default slot); imports `fixture`
- `test/components/layout-primitives.test.ts` — Deleted (content redistributed 1:1, OQ-3)

## Decisions Made
- **Per-block minimal imports:** Only stack needs `waitForUpdate` (its dynamic `direction` prop-update assertion); grid/surface/panel/card import `fixture` only. This satisfies `noUnusedLocals` (enforced per CLAUDE.md) without altering any assertion — matching the light-hardening constraint (Pitfall 1: split, not rewrite).
- **Delete-after-pass ordering:** `layout-primitives.test.ts` was removed only after all five dedicated files passed under the jsdom project, so no assertion was ever orphaned (OQ-3, race-free single owner).

## Deviations from Plan
None — plan executed exactly as written. The only adjustment was dropping unused helper imports per block (`noUnusedLocals`), which the plan explicitly instructs ("drop unused imports"); this is not a deviation.

## Known Stubs
None — all five files exercise real layout-primitive components and real assertions lifted verbatim from the grouped file. No placeholder/empty-data stubs introduced.

## Threat Flags
None — test authoring only. No runtime code, dependency, or input surface changed; new files run under the existing read-only CI jsdom project (threat T-01-02a: accept).

## Self-Check: PASSED
- All 5 created files present; `test/components/layout-primitives.test.ts` absent as intended.
- Both commits (8e6152d, cf8068b) exist in git history.

---
*Phase: 01-test-coverage-ci-gates-foundation*
*Completed: 2026-08-11*
