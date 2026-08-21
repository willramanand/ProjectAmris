---
phase: 02-api-cleanup-cem-baseline
plan: 03
subsystem: api
tags: [web-components, lit, custom-events, changesets, custom-elements-manifest, overlay]

# Dependency graph
requires:
  - phase: 02-01
    provides: CEM baseline (api/custom-elements.baseline.json) + report-only surface comparator (scripts/cem-diff.mjs)
  - phase: 02-02
    provides: api/AUDIT.md cross-component consistency matrices with the overlay lifecycle rename mapping (PENDING-DECISION rows)
provides:
  - "am-dropdown, am-popover, am-context-menu emit canonical am-open/am-close lifecycle events (was am-show/am-hide)"
  - "One wave Changeset recording the overlay lifecycle break (.changeset/normalize-overlay-lifecycle-events.md)"
  - "Re-committed CEM baseline absorbing the three intended event renames (D-14)"
  - "Established the atomic rename-wave discipline (code + @fires JSDoc + tests + one Changeset + baseline) reused by Plans 04 and 05"
affects: [02-04, 02-05, 05-documentation-migration, 06-freeze-ship]

# Actuals (#2632)
actuals:
  tokens: 2500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic event-rename wave: dispatch string + @fires JSDoc + test assertion renamed together; grep for old string returns zero as the done-condition (D-04 hard rename)"
    - "Re-commit CEM baseline after each approved wave so the report-only diff flags only unintended drift (D-14)"

key-files:
  created:
    - .changeset/normalize-overlay-lifecycle-events.md
  modified:
    - src/components/dropdown/dropdown.ts
    - src/components/popover/popover.ts
    - src/components/context-menu/context-menu.ts
    - test/components/dropdown.test.ts
    - test/components/popover.test.ts
    - test/components/context-menu.test.ts
    - api/custom-elements.baseline.json

key-decisions:
  - "Changeset bump is minor (not major): pre-1.0 (0.2.0) breaking changes are minor under semver/Changesets; a major would prematurely force 1.0.0 before the Phase 6 freeze"

patterns-established:
  - "Rename wave: rename dispatch + @fires + tests in one commit, zero surviving old strings, one Changeset (D-04/D-05)"
  - "Baseline re-commit: cp dist/custom-elements.json to api/custom-elements.baseline.json; comparator confirms only intended surface drift (D-14)"

requirements-completed: [API-02]

coverage:
  - id: D1
    description: "am-dropdown, am-popover, am-context-menu dispatch am-open on open and am-close on close; old am-show/am-hide removed outright (no alias)"
    requirement: API-02
    verification:
      - kind: unit
        ref: "test/components/dropdown.test.ts, test/components/popover.test.ts, test/components/context-menu.test.ts (18 tests, jsdom)"
        status: pass
      - kind: other
        ref: "grep -rE 'am-show|am-hide' over src + test = zero hits (D-04 done-condition)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exactly one wave Changeset documents the overlay lifecycle normalization (D-05)"
    requirement: API-02
    verification:
      - kind: other
        ref: "ls .changeset/normalize-overlay-lifecycle-events.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "CEM baseline re-committed; report-only surface diff shows only the three overlay open/close renames; tagName SET unchanged (79); full suite green (D-14)"
    requirement: API-02
    verification:
      - kind: other
        ref: "npm run diff:surface (old-baseline vs new) reports only am-open/am-close on the 3 overlays; module count 202, tagName count 79 unchanged"
        status: pass
      - kind: unit
        ref: "npm run test:run (jsdom, 481 passed) + npm run test:browser (Chromium, 39 passed)"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-08-16
status: complete
---

# Phase 2 Plan 03: Normalize Overlay Lifecycle Events Summary

**am-dropdown, am-popover, and am-context-menu renamed from am-show/am-hide to canonical am-open/am-close (hard rename, no alias), landed as one wave Changeset with the CEM baseline re-committed and the full suite green.**

## Performance

- **Duration:** ~4 min (active execution; excludes the human decision-gate pause)
- **Started:** 2026-08-16T23:44:00Z (approx, first edit)
- **Completed:** 2026-08-16T23:45:36Z
- **Tasks:** 2 executed (Task 1 was a human decision checkpoint — approved by coordinator)
- **Files modified:** 7 (6 source/test + 1 baseline), 1 Changeset created

## Accomplishments
- Renamed the three overlay outliers' lifecycle events to `am-open`/`am-close`, matching native `<dialog>` and the already-canonical overlays (dialog/drawer/command-palette/toast) — D-01.
- Removed the old `am-show`/`am-hide` names outright: no backward-compat alias, no dual-firing (D-04 hard rename). Repo-wide grep returns zero hits.
- Updated each component's `@fires` JSDoc and the three characterization tests to assert the new names; 18 overlay tests pass in jsdom.
- Wrote exactly one wave Changeset (`minor` bump) documenting the break with an old→new table and a migration note (D-05).
- Re-committed `api/custom-elements.baseline.json`; the report-only comparator confirms the only surface drift vs the prior baseline is the three overlay open/close renames, tagName SET unchanged at 79 (D-14).
- Full suite green: jsdom 481 passed, Chromium browser lane 39 passed.

## Task Commits

Task 1 was a `checkpoint:decision` (one-way door, D-01) — no commit; approved by the coordinator to land the mapping as-mapped.

1. **Task 2: Rename overlay lifecycle events + JSDoc + tests, one Changeset** - `e1ee486` (feat)
2. **Task 3: Re-commit baseline + report-only diff + full suite** - `8214fa8` (chore)

## Files Created/Modified
- `src/components/dropdown/dropdown.ts` - Dispatch `am-open`/`am-close`; `@fires` JSDoc updated
- `src/components/popover/popover.ts` - Dispatch `am-open`/`am-close`; `@fires` JSDoc updated
- `src/components/context-menu/context-menu.ts` - Dispatch `am-open` (open) and `am-close` (Escape + outside-click close); `@fires` JSDoc updated
- `test/components/dropdown.test.ts` - Assertions renamed to `am-open`/`am-close`
- `test/components/popover.test.ts` - Assertions renamed to `am-open`/`am-close`
- `test/components/context-menu.test.ts` - Assertions renamed to `am-open`/`am-close`
- `.changeset/normalize-overlay-lifecycle-events.md` - One wave Changeset (minor) with old→new table + migration note
- `api/custom-elements.baseline.json` - Re-committed post-wave snapshot (D-14)

## Decisions Made
- **Changeset bump = `minor`, not `major`.** The plan said "minor/major per Changesets convention for a breaking change." The package is pre-1.0 (0.2.0); under semver/Changesets a breaking change in the 0.x range is a `minor` bump (0.2.0 → 0.3.0). A `major` would force 1.0.0 prematurely, ahead of the Phase 6 freeze. Chose `minor` to signal the break without triggering the 1.0 release.
- Runtime behavior (open/close gating, listener attach/detach ordering, positioning) was left untouched — only the event-name strings and their assertions changed, per the plan's behavior-preservation constraint.

## Deviations from Plan
None - plan executed exactly as written. Behavior-preservation and scope fences (do not touch dialog/drawer/command-palette/toast/alert; do not fix listener-lifecycle seams — Phase 3 FIX-02) were all honored.

## Issues Encountered
- **Baseline git diff showed 6136 insertions / 6136 deletions** — appeared at first to be unintended drift. Investigation confirmed it is CEM's non-deterministic module ordering across builds (the exact "Pitfall 3" the comparator normalizes by keying on tagName). Module count (202) and tagName count (79) are identical between old and new baselines, and `scripts/cem-diff.mjs` run between the two reports only the three overlay `am-open`/`am-close` renames — no elements added/removed, no other surface change. No action needed; the churn is inherent to the raw snapshot and invisible to the surface gate.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The atomic rename-wave discipline (code + `@fires` JSDoc + tests + one Changeset + re-committed baseline) is proven and ready for Plan 04 (selection events, D-02) and Plan 05 (change/toggle events, D-03).
- The overlay lifecycle rows in `api/AUDIT.md` are now resolved (were PENDING-DECISION); the remaining rename mapping rows (selection, change/toggle, prop/boolean-naming) are consumed by Plans 04-05.
- Report-only surface gate remains report-only (flips to enforcing at Phase 6, SHIP-01).

## Self-Check: PASSED

- FOUND: `.changeset/normalize-overlay-lifecycle-events.md`
- FOUND: `api/custom-elements.baseline.json`
- FOUND: `.planning/phases/02-api-cleanup-cem-baseline/02-03-SUMMARY.md`
- FOUND commit: `e1ee486` (Task 2)
- FOUND commit: `8214fa8` (Task 3)

---
*Phase: 02-api-cleanup-cem-baseline*
*Completed: 2026-08-16*
