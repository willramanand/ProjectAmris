---
phase: 02-api-cleanup-cem-baseline
plan: 02
subsystem: api
tags: [custom-elements-manifest, cem, audit, design-tokens, web-components, tooling]

# Dependency graph
requires:
  - phase: 02-01
    provides: dist/custom-elements.json manifest + api/custom-elements.baseline.json + scripts/cem-diff.mjs indexing pattern
provides:
  - api/AUDIT.md — seven dimension matrices (event, prop, boolean-naming, default, slot, part, --am-* token) across all 79 registered tagNames
  - Concrete old→new rename mapping (PENDING-DECISION) consumed by Plans 03-05
  - Frozen public surface enumeration (212 global tokens + 53 per-component tokens + 21 slots + 76 parts)
  - Undocumented-but-used token gap list (found --am-z-toast used but never defined/tagged)
  - scripts/build-audit.mjs — zero-dep reproducible matrix generator
affects: [02-03, 02-04, 02-05, 02-09, api-freeze, rename-waves]

# Actuals
actuals:
  tokens: 15000
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-dep .mjs generator mirroring build-tokens-css.mjs header + scripts/cem-diff.mjs tagName keying"
    - "CEM events reconciled against live `new CustomEvent` grep so @fires undercounting cannot hide a dispatch"
    - "Global --am-* token surface extracted from src/tokens css`` blocks; per-component tokens from CEM @cssprop"

key-files:
  created:
    - scripts/build-audit.mjs
    - api/AUDIT.md
  modified: []

key-decisions:
  - "Outlier = an event/prop this audit maps to a different canonical target under D-01/D-02/D-03; every rename-mapping row marked PENDING-DECISION (renames are Plans 03-05, not this plan)"
  - "data-grid am-row-select/am-selection-change reconciled to am-change with the single-vs-multi detail shape left as an explicit A1 decision for the rename wave"
  - "tabs am-tab-change → am-change (value-change); accordion/tree-view am-toggle kept (expand-state is a distinct semantic per D-03)"
  - "Matrices key on tagName so row count = 79 registered elements (not 66 component files) — the 13 compound/sub-elements are never dropped"

patterns-established:
  - "Reproducible audit: `npm run build:manifest && node scripts/build-audit.mjs` deterministically regenerates api/AUDIT.md from the same manifest cem-diff.mjs reads"
  - "Undocumented-token gap detection: tokens referenced in a component css`` but neither a global token nor a CEM @cssprop are flagged for pre-freeze tagging"

requirements-completed: [API-01, API-04]

coverage:
  - id: D1
    description: "api/AUDIT.md contains seven dimension matrices across all 79 registered custom elements (event, prop, boolean-naming, default, slot, part, --am-* token)"
    requirement: "API-01"
    verification:
      - kind: automated_ui
        ref: "node scripts/build-audit.mjs && grep -c '| Component' api/AUDIT.md (>=4) + 79 rows per matrix"
        status: pass
    human_judgment: false
  - id: D2
    description: "Concrete old→new rename mapping (overlay open/close, selection change/select, change/toggle family) marked PENDING-DECISION for Plans 03-05"
    requirement: "API-01"
    verification:
      - kind: manual_procedural
        ref: "grep -qi 'Rename mapping' api/AUDIT.md; target correctness confirmed at each rename wave checkpoint"
        status: pass
    human_judgment: true
    rationale: "Which outlier maps to which canonical target is a naming-vocabulary judgment confirmed at each rename wave's checkpoint (Plans 03-05) per the Phase 2 validation strategy — the generator only proposes targets."
  - id: D3
    description: "Frozen public surface enumeration (slots + parts + global & per-component --am-* tokens) plus undocumented-but-used token gap list"
    requirement: "API-04"
    verification:
      - kind: automated_ui
        ref: "grep -qi 'Frozen public surface' api/AUDIT.md && grep -qi 'Undocumented' api/AUDIT.md && grep -c -- '--am-' api/AUDIT.md (>0)"
        status: pass
    human_judgment: false

# Metrics
duration: 14min
completed: 2026-08-16
status: complete
---

# Phase 2 Plan 02: Cross-Component Consistency Audit Summary

**Zero-dep `build-audit.mjs` generating `api/AUDIT.md` — seven dimension matrices across all 79 registered tagNames, a PENDING-DECISION rename mapping for Plans 03-05, the frozen public surface (212 global + 53 per-component tokens, 21 slots, 76 parts), and an undocumented-token gap that caught `--am-z-toast` used-but-undefined.**

## Performance

- **Duration:** ~14 min
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments
- `scripts/build-audit.mjs`: zero-dep ESM generator reading `dist/custom-elements.json`, keyed by tagName (mirrors `scripts/cem-diff.mjs`), reconciling CEM `events` against a live `new CustomEvent` grep of `src/components` so dispatched-but-undocumented events (e.g. combobox `am-search`) still appear.
- `api/AUDIT.md`: four behavioral matrices (event, prop, boolean-naming, default) + three surface matrices (slot, part, `--am-*` token), each with exactly 79 rows — one per registered tagName.
- Concrete old→new rename mapping under the D-01/D-02/D-03 vocabulary: overlay lifecycle `am-show`/`am-hide` → `am-open`/`am-close`; selection `am-select-option` + data-grid `am-row-select`/`am-selection-change` → `am-change`; discrete-pick `am-select` kept; `am-tab-change` → `am-change`; accordion/tree-view `am-toggle` kept. Every row marked PENDING-DECISION.
- Frozen public surface enumeration (API-04, D-11): 212 global `--am-*` tokens (from `src/tokens/{primitives,semantic,dark}.css.ts`), 53 per-component `@cssprop` tokens, 21 unique slots, 76 unique `::part()` names.
- Undocumented-but-used token gap detector surfaced a real finding: `am-toast`/`am-toast-region` reference `--am-z-toast`, which is neither a defined global token nor an `@cssprop` — flagged for tagging before the Plan 09 freeze (not fixed here, per plan).
- Provenance header records both distinct counts (66 component files / 79 registered tagNames), the generation command, source manifest, seven dimensions, and a reviewer-assessed note.

## Task Commits

1. **Task 1: Behavioral matrices + rename mapping** - `6cc8552` (feat)
2. **Task 2: Slot/part/token matrices + frozen-surface + gap** - `6eeb6d8` (feat)
3. **Task 3: Provenance header + coverage confirmation** - `43395b5` (feat)

## Files Created/Modified
- `scripts/build-audit.mjs` - Zero-dep matrix generator: reads CEM + greps src/components (events) + src/tokens (global tokens), emits all seven matrices, rename mapping, frozen surface, and gap list.
- `api/AUDIT.md` - The generated audit (unpublished, D-12): matrices + mapping + frozen surface + gap.

## Decisions Made
- **Outlier definition anchored to the rename mapping**: an event/prop is marked OUTLIER only when the audit maps it to a different canonical target under D-01/D-02/D-03. This keeps the marking defensible rather than heuristic.
- **data-grid detail shape left open (A1)**: `am-row-select`/`am-selection-change` → `am-change` with the single-vs-multi payload noted as a decision to resolve from the live component API at the rename wave, per D-02 Discretion.
- **Change/toggle split under D-03**: value-changing events → `am-change` (tabs, pagination); expand-state events kept as `am-toggle` (accordion, tree-view).
- **All 79 tagNames tabulated**: matrices key on tagName (like `cem-diff.mjs`), so the 13 compound/sub-elements are included, not just the 66 top-level component files.

## Deviations from Plan
None - plan executed exactly as written. No renames applied (prohibition honored); no `api/` added to `package.json` `files` (D-12 honored, verified); no new dependency added (D-13 honored).

## Issues Encountered
None. The undocumented-token gap detector working correctly surfaced a legitimate finding (`--am-z-toast`); this is plan-intended output flagged for Plan 09, not a defect in this plan's deliverables.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **Plans 03-05 (rename waves)** can read the concrete old→new mapping straight from `api/AUDIT.md` under the D-01/D-02/D-03 vocabulary; each row is PENDING-DECISION for confirmation at the wave's checkpoint.
- **Plan 09 (freeze)** has the frozen public surface enumerated, plus a pre-freeze action item: tag or define `--am-z-toast` (and re-run the generator to confirm the gap list is empty) before declaring the surface frozen.
- Regenerate any time with `npm run build:manifest && node scripts/build-audit.mjs` — output is deterministic.

## Self-Check: PASSED

- FOUND: scripts/build-audit.mjs
- FOUND: api/AUDIT.md
- FOUND: .planning/phases/02-api-cleanup-cem-baseline/02-02-SUMMARY.md
- FOUND commits: 6cc8552, 6eeb6d8, 43395b5

---
*Phase: 02-api-cleanup-cem-baseline*
*Completed: 2026-08-16*
