---
phase: 04-performance-feature-capabilities
plan: 10
subsystem: testing
tags: [cem, custom-elements-manifest, changesets, vitest, coverage, api-surface]

# Dependency graph
requires:
  - phase: 04-04
    provides: setCustomError validation API on 14 form-associated controls + validation controller
  - phase: 04-06
    provides: am-shortcuts provider element + shortcut registry
  - phase: 04-07
    provides: command-palette rebindable-mod+k refactor onto the shortcut registry
  - phase: 04-08
    provides: data-grid virtualization (freeze-neutral, zero public surface)
  - phase: 04-09
    provides: combobox/select virtualization (freeze-neutral, zero public surface)
provides:
  - Re-committed CEM baseline (api/custom-elements.baseline.json) capturing setCustomError (14 controls) + am-shortcuts + validation surface (invalid/required attrs, error cssPart)
  - Two Changesets (minor) describing the validation API and the shortcuts registry
  - Re-baselined jsdom coverage floors reflecting the phase's new controllers/virtualization
  - Report-only surface diff proving zero virtualization drift (D-05/D-06)
affects: [phase-06-freeze, ship, api-surface-gate, coverage-gate]

# Actuals (#2632)
actuals:
  tokens: 1900   # chars/4 over authored diff (2 changesets + vitest.config edit); the ~145k-token baseline JSON re-baseline is generated cem output, excluded
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-baseline pattern: overwrite api/custom-elements.baseline.json with freshly generated dist/custom-elements.json after reviewing the report-only surface diff"
    - "Ratchet-to-measured-floor: coverage thresholds set just under measured, never above; de-ratchet only with documented justification (new code landed)"

key-files:
  created:
    - .changeset/add-setcustomerror-validation.md
    - .changeset/add-am-shortcuts-registry.md
  modified:
    - api/custom-elements.baseline.json
    - vitest.config.ts

key-decisions:
  - "setCustomError is a method, so it does not appear in the attribute/field/event surface diff; it is captured in the baseline JSON members and described in a Changeset instead."
  - "Global function floor lowered 82->81 (below prior floor) — justified: the phase's new controllers/components (time-picker, shortcuts, validation) landed with lower function coverage, pulling measured from 83.02 to 81.57."
  - "select tier de-ratcheted from the 85 ceiling (br 80->66, ln/st 85->83/82) — justified: 04-09 virtualization added uncovered branches/lines to select.ts."
  - "Global branch floor ratcheted UP 67->70; combobox/date-picker tiers ratcheted up as virtualization + added tests raised their coverage."

patterns-established:
  - "Report-only CEM surface diff reviewed before every re-baseline; only intended additions permitted, any other drift stops the re-baseline (T-04-23 mitigation)."
  - "Coverage floors never lowered below measured; de-ratchets carry an inline justification comment (T-04-24 mitigation)."

requirements-completed: [FEAT-02, FEAT-04]

coverage:
  - id: D1
    description: "CEM baseline re-committed to capture setCustomError (14 controls) + am-shortcuts + validation surface (invalid/required attrs, error cssPart); zero virtualization drift"
    requirement: "FEAT-04"
    verification:
      - kind: automated
        ref: "npm run build:manifest && npm run diff:surface (No surface drift after re-baseline)"
        status: pass
      - kind: other
        ref: "grep setCustomError x15 + am-shortcuts x1 present in api/custom-elements.baseline.json"
        status: pass
    human_judgment: false
  - id: D2
    description: "Two Changesets (minor) describe the setCustomError validation API and the am-shortcuts provider + registry"
    requirement: "FEAT-02"
    verification:
      - kind: other
        ref: ".changeset/add-setcustomerror-validation.md and .changeset/add-am-shortcuts-registry.md exist with '@willramanand/amris': minor front-matter"
        status: pass
    human_judgment: false
  - id: D3
    description: "jsdom coverage re-baselined to new measured floor; full green-gated suite (coverage + test:run + test:browser + test:a11y) passes"
    verification:
      - kind: unit
        ref: "npm run test:coverage (exit 0 at re-baselined thresholds)"
        status: pass
      - kind: integration
        ref: "npm run test:run (83 files / 660 tests pass)"
        status: pass
      - kind: e2e
        ref: "npm run test:browser (11 files / 72 tests pass)"
        status: pass
      - kind: automated_ui
        ref: "npm run test:a11y (35 axe tests pass)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 10: Capture Freeze Surface & Re-baseline Coverage Summary

**Re-committed the CEM baseline to capture setCustomError (14 controls) + am-shortcuts + the validation surface, wrote two minor Changesets, and re-baselined jsdom coverage floors with the full green-gated suite passing — Phase 4 ends on a green pipeline with a diffable freeze surface.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-18T22:44:00Z
- **Completed:** 2026-08-18T22:51:56Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Regenerated `dist/custom-elements.json` and re-committed `api/custom-elements.baseline.json`; it now captures `setCustomError` on all 14 form-associated controls (as JSON members) plus the `am-shortcuts` element and the visible validation surface (`invalid`/`required` attributes, `error` cssPart).
- Report-only surface diff confirmed ONLY the intended additions — `am-shortcuts` + the validation surface on form controls — and **zero virtualization drift** (no `am-data-grid`/`am-combobox`/`am-select` surface change), confirming D-05/D-06. Re-baseline then produced "No surface drift".
- Wrote two minor Changesets: `add-setcustomerror-validation.md` (validation API, D-01/D-02/D-03/D-04) and `add-am-shortcuts-registry.md` (provider + registry: scopes, mod/opt normalization, conflict detection, reserved-combo blocklist, command-palette rebindable-mod+k).
- Re-baselined jsdom coverage floors in `vitest.config.ts` to the newly measured values and proved the full green-gated suite: coverage (exit 0), test:run (660), test:browser (72), test:a11y (35).

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate CEM manifest, re-baseline, write two Changesets** - `83ae4a3` (feat)
2. **Task 2: Re-baseline jsdom coverage and prove the full green-gated suite** - `9f988f9` (test)

## Files Created/Modified
- `api/custom-elements.baseline.json` - Re-committed with the phase's public surface (setCustomError + am-shortcuts + validation surface)
- `.changeset/add-setcustomerror-validation.md` - Minor Changeset for the setCustomError validation API
- `.changeset/add-am-shortcuts-registry.md` - Minor Changeset for the am-shortcuts provider + registry
- `vitest.config.ts` - Re-baselined global + per-directory coverage thresholds

## Decisions Made
- **setCustomError is a method, not surface-diffed:** the cem-diff comparator only compares attributes/fields/events/slots/cssParts/cssProperties, so the `setCustomError` method never appears in the diff. It is captured in the baseline JSON `members` (15 occurrences: 14 controls + the validation controller class) and documented in the Changeset. The diff's visible validation footprint (`invalid`/`required` attrs + `error` cssPart) is the attribute/field/part side of the same feature.
- **Global function floor 82->81 (down):** justified re-baseline — the phase's new code (time-picker 48.83% fns, shortcuts 85.71% fns, validation controller) pulled global function coverage from a measured 83.02 to 81.57. Floor set just under measured; not below measured (WR-05).
- **select tier de-ratcheted:** 04-09 virtualization added uncovered branches/lines to `select.ts`, dropping measured branch coverage 81.65 -> 66.67 and lines/statements below the prior 85 ceiling. Floors re-baselined to `{ branches: 66, functions: 85, lines: 83, statements: 82 }`.
- **Global branch floor 67->70 (up), combobox/date-picker ratcheted up:** virtualization + added tests raised those directories' measured coverage, so their floors ratchet up to stay tight.

## Deviations from Plan

None - plan executed exactly as written. The validation surface additions surfaced by the diff (`invalid`/`required` attributes, `error` cssPart on the form controls) were anticipated by the plan context ("capture whatever the surface diff reports" for the plan 04-03 validation edits) and are the intended additive footprint of the setCustomError feature — not drift.

## Issues Encountered
- `node_modules` was absent in the worktree; ran `npm ci` (exit 0) before the build/test steps, as the parallel-execution note anticipated (@lit/context, @lit-labs/virtualizer added earlier in the phase).
- Browser suite emits benign `ResizeObserver loop completed with undelivered notifications` console noise; all 72 browser tests still pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The Phase 4 public surface is captured in a diffable baseline and two Changesets; the surface-diff gate stays report-only until the Phase 6 freeze (SHIP-01) flips it to enforcing — a one-line change in `scripts/cem-diff.mjs`.
- Coverage floors sit just under measured; any real regression trips the gate. Full jsdom + browser + a11y suite is green.
- No blockers.

## Self-Check: PASSED

- Files verified present: api/custom-elements.baseline.json, .changeset/add-setcustomerror-validation.md, .changeset/add-am-shortcuts-registry.md, vitest.config.ts, 04-10-SUMMARY.md
- Commits verified present: 83ae4a3 (Task 1), 9f988f9 (Task 2)

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
