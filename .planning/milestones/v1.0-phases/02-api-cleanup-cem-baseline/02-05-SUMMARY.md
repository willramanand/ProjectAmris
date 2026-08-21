---
phase: 02-api-cleanup-cem-baseline
plan: 05
subsystem: api
tags: [web-components, lit, custom-elements-manifest, changesets, api-freeze, tabs, combobox]

# Dependency graph
requires:
  - phase: 02-api-cleanup-cem-baseline (Plan 01)
    provides: CEM baseline snapshot + cem-diff.mjs comparator + diff:surface script
  - phase: 02-api-cleanup-cem-baseline (Plan 03)
    provides: overlay lifecycle event normalization (am-open/am-close)
  - phase: 02-api-cleanup-cem-baseline (Plan 04)
    provides: selection event normalization (am-change vs am-select split)
provides:
  - Value-changing tabs event renamed am-tab-change -> am-change (matches am-pagination)
  - Combobox boolean prop select -> searchInTrigger (attribute search-in-trigger)
  - Combobox boolean prop async -> remote (reserved-word collision resolved)
  - One Changeset documenting the D-03 remaining-outliers cleanup wave
  - Re-committed post-wave CEM baseline (D-14)
affects: [02-api-cleanup-cem-baseline Plan 06 (combobox refactor API-03), Plan 09 (API freeze), any docs/story referencing tabs/combobox public surface]

actuals:
  tokens: 3400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "D-04 hard rename: old event/prop names removed outright, no backward-compat alias"
    - "Multi-word boolean prop = camelCase property + explicit kebab-case reflected attribute (attribute: 'search-in-trigger')"

key-files:
  created:
    - .changeset/normalize-remaining-outliers.md
  modified:
    - src/components/tabs/tabs.ts
    - src/components/combobox/combobox.ts
    - test/components/tabs.test.ts
    - test/components/combobox.test.ts
    - api/custom-elements.baseline.json

key-decisions:
  - "tabs value-change event -> am-change (canonical value-change vocabulary, matches am-pagination)"
  - "expand-state am-toggle (am-accordion/am-tree-view) left unchanged — distinct semantic from value-change"
  - "combobox select boolean -> searchInTrigger/search-in-trigger (resolved <am-select> element-name collision)"
  - "combobox async boolean -> remote (async reads as a reserved JS concept)"

patterns-established:
  - "Final pre-freeze rename wave: full D-03 normalization, not just egregious cases"
  - "Report-only CEM diff (diff:surface) confirms the surface delta is exactly the intended renames before re-committing the baseline"

requirements-completed: [API-02]

coverage:
  - id: D1
    description: "am-tabs dispatches am-change (was am-tab-change) with unchanged { panel } detail; old name removed from src+test"
    requirement: "API-02"
    verification:
      - kind: unit
        ref: "test/components/tabs.test.ts (switches tab on click and emits am-change; keyboard nav + already-active guards)"
        status: pass
      - kind: other
        ref: "grep -rnE 'am-tab-change' src test => zero hits (D-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-combobox boolean prop select renamed to searchInTrigger (attribute search-in-trigger); runtime behavior unchanged"
    requirement: "API-02"
    verification:
      - kind: unit
        ref: "test/components/combobox.test.ts (full suite incl. select-mode paths) — 15 tests pass"
        status: pass
      - kind: other
        ref: "npm run diff:surface => am-combobox attributes/fields +: search-in-trigger; -: select"
        status: pass
    human_judgment: false
  - id: D3
    description: "am-combobox boolean prop async renamed to remote; am-search behavior unchanged"
    requirement: "API-02"
    verification:
      - kind: unit
        ref: "test/components/combobox.test.ts (does not filter and emits am-search in remote mode)"
        status: pass
      - kind: other
        ref: "npm run diff:surface => am-combobox attributes/fields +: remote; -: async"
        status: pass
    human_judgment: false
  - id: D4
    description: "One Changeset documents the D-03 cleanup wave; CEM baseline re-committed with zero residual drift"
    requirement: "API-02"
    verification:
      - kind: other
        ref: "ls .changeset/normalize-remaining-outliers.md; npm run diff:surface post-copy => 'No surface drift'"
        status: pass
      - kind: integration
        ref: "npm run test:run (481 pass) + npm run test:browser (39 pass)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-17
status: complete
---

# Phase 2 Plan 05: Remaining-Outliers Normalization Summary

**Final pre-freeze rename wave: tabs value-change event am-tab-change -> am-change, combobox booleans select -> searchInTrigger and async -> remote, landed as one Changeset with the CEM baseline re-committed.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-17T04:11:00Z
- **Completed:** 2026-08-17T04:15:16Z
- **Tasks:** 2 executed (Task 1 was a blocking decision checkpoint, resolved by coordinator)
- **Files modified:** 5 (4 source/test + 1 baseline) + 1 Changeset created

## Accomplishments
- Renamed the value-changing tabs event `am-tab-change` -> `am-change` (dispatch, `@fires` JSDoc, and all 11 test references), aligning it with `am-pagination`'s canonical value-change vocabulary.
- Confirmed and preserved the distinct expand-state semantic: `am-accordion` / `am-tree-view` `am-toggle` and `am-pagination` `am-change` were left untouched (verified via `git diff --name-only` and the CEM diff showing no drift on those elements).
- Renamed the combobox `select` boolean prop (which collided with the `<am-select>` element name) to `searchInTrigger` with reflected attribute `search-in-trigger`, updating the `@property` declaration, all 4 internal references, and JSDoc.
- Renamed the combobox `async` boolean prop (reads as a reserved JS concept) to `remote`, updating all 5 internal references, the class JSDoc, the `@example` block, and inline comments.
- Wrote exactly one Changeset (`normalize-remaining-outliers.md`, minor) documenting every old->new event and prop name with a consumer migration guide (D-05).
- Re-committed the post-wave CEM baseline (D-14); `diff:surface` confirms zero residual drift and the tagName SET is unchanged (no element added/removed).

## Task Commits

Each task was committed atomically:

1. **Task 1: Approve the remaining-outliers rename set** - checkpoint:decision (blocking) — resolved by coordinator (no commit); combobox targets pinned to `searchInTrigger`/`search-in-trigger` and `remote`.
2. **Task 2: Rename remaining event + prop/boolean outliers + JSDoc + tests + one Changeset** - `ea0a4b8` (feat)
3. **Task 3: Re-commit baseline + report-only diff + full suite green** - `befd7de` (chore)

_Verification: `npx vitest run` tabs+combobox (29 pass), grep guard zero hits, `diff:surface` exit 0 showing only the intended renames, full `test:run` (481 pass) + `test:browser` (39 pass)._

## Files Created/Modified
- `.changeset/normalize-remaining-outliers.md` - One Changeset for the D-03 cleanup wave (minor; event + prop rename table + migration).
- `src/components/tabs/tabs.ts` - Value-change event dispatch + `@fires` JSDoc renamed to `am-change`.
- `src/components/combobox/combobox.ts` - `select` -> `searchInTrigger` (attr `search-in-trigger`), `async` -> `remote`; internal refs, JSDoc, example, and comments updated.
- `test/components/tabs.test.ts` - All `am-tab-change` assertions/listeners renamed to `am-change`.
- `test/components/combobox.test.ts` - Type fields and `remote`-mode test/attribute updated.
- `api/custom-elements.baseline.json` - Re-committed post-wave manifest snapshot (D-14).

## Decisions Made
- None beyond the coordinator-approved rename set. The combobox prop targets — previously "proposed" in `api/AUDIT.md` — were pinned at the Task 1 checkpoint: `select` -> `searchInTrigger`/`search-in-trigger`, `async` -> `remote`.

## Deviations from Plan

None - plan executed exactly as written. The one prohibited action (collapsing expand-state `am-toggle` into `am-change`) was explicitly avoided; combobox internals were not refactored (deferred to Plan 06).

## Issues Encountered
- A post-edit grep of `dist/custom-elements.json` surfaced one lingering `"name": "select"`. Investigation showed it is a `kind: method` (`select()` — "Programmatically select the input text.") on an input-like component, wholly unrelated to the combobox boolean prop. The authoritative `diff:surface` confirmed the combobox `select`/`async` attributes AND fields were removed cleanly. No action needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The public event/prop vocabulary is now fully normalized (D-03 complete) — this was the last rename wave. The surface is consistent and ready for the Plan 06 combobox refactor (API-03) and the Plan 09 API freeze.
- Three Changesets now accumulate for the phase's pre-1.0 breaking changes (overlay lifecycle, selection, remaining outliers); they will roll into the minor pre-freeze release.

## Self-Check: PASSED

- FOUND: .changeset/normalize-remaining-outliers.md
- FOUND: api/custom-elements.baseline.json
- FOUND: .planning/phases/02-api-cleanup-cem-baseline/02-05-SUMMARY.md
- FOUND commit: ea0a4b8 (Task 2)
- FOUND commit: befd7de (Task 3)

---
*Phase: 02-api-cleanup-cem-baseline*
*Completed: 2026-08-17*
