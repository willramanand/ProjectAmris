---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02
current_phase_name: api-cleanup-cem-baseline
status: executing
stopped_at: Completed 02-09-PLAN.md (phase 02 closing gate — surface FROZEN)
last_updated: "2026-08-17T22:45:32.648Z"
last_activity: 2026-08-17
last_activity_desc: Phase 02 execution started
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 17
  completed_plans: 17
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-10)

**Core value:** A frozen, dependable public API backed by real test coverage — consumers can drop `@willramanand/amris` into any app and trust it to be correct, accessible, and API-stable.
**Current focus:** Phase 02 — api-cleanup-cem-baseline

## Current Position

Phase: 02 (api-cleanup-cem-baseline) — COMPLETE
Plan: 9 of 9 (all plans complete)
Status: Phase 02 complete — surface FROZEN, final baseline committed
Last activity: 2026-08-17 — Phase 02 closing gate executed (02-09)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 8
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 8 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 12 | 3 tasks | 14 files |
| Phase 01 P02 | 1min | 2 tasks | 6 files |
| Phase 01 P03 | ~1 min | 2 tasks | 8 files |
| Phase 01 P04 | 6min | 3 tasks | 8 files |
| Phase 01 P05 | 5min | 3 tasks | 3 files |
| Phase 01 P06 | 3min | 2 tasks | 1 files |
| Phase 01 P07 | 4min | 3 tasks | 8 files |
| Phase 01 P08 | 7min | 3 tasks | 3 files |
| Phase 02 P01 | 3 | 3 tasks | 5 files |
| Phase 02 P02 | 14 | 3 tasks | 2 files |
| Phase 02 P03 | 4 | 2 tasks | 7 files |
| Phase 02 P04 | 4min | 3 tasks | 5 files |
| Phase 02 P05 | 4min | 2 tasks | 5 files |
| Phase 02 P06 | 5min | 3 tasks | 4 files |
| Phase 02 P07 | 4min | 3 tasks | 3 files |
| Phase 02 P08 | 3min | 2 tasks | 2 files |
| Phase 02 P09 | 6min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Ship a frozen v1.0, not just a quality bar — consumers need an API-stable release.
- Allow breaking API changes before the freeze — last chance to fix rough/inconsistent APIs (Phase 2 precedes the Phase 6 freeze).
- Carve out a minimal real-browser test lane (Vitest Browser Mode + Playwright/Chromium) for the 4 load-bearing areas — jsdom cannot prove ElementInternals/focus/dialog/positioning (Phase 1).
- Adopt a non-exported `src/internal/` boundary for feature machinery — keeps virtualization/validation/shortcut controllers off the frozen surface (Phase 4).
- [Phase ?]: Vitest split into jsdom+browser projects; browser lane omits setupFiles for native ElementInternals (Pitfall 2)
- [Phase ?]: Coverage folds over jsdom only (OQ-1); branch-gated with per-dir tiers at measured baseline (D-01/D-02)
- [Phase ?]: Layout primitives (stack/grid/surface/panel/card) split into dedicated 1:1 jsdom test files; grouped layout-primitives.test.ts retired with zero coverage loss
- [Phase ?]: 01-03: split 8 display components into dedicated 1:1 test files; each imports only fixture (noUnusedLocals); display-trivial.test.ts left intact for plans 04/08.
- [Phase ?]: 01-06: TEST-02 proven for all form-associated controls via real FormData/native setFormValue in Chromium (mock-free browser suite)
- [Phase ?]: 01-07: TEST-04/05 covered in jsdom lane green-on-arrival; clamp asserts observable DOM highlight bound (raw _highlightedIndex un-clamped on option replace — Phase 3 FIX-02 finding)
- [Phase ?]: 01-07: am-tooltip attaches NO document listeners (scoped mouse/focus + floating-ui autoUpdate) — TEST-05 asserts absence, captured for Phase 3 FIX-02
- [Phase ?]: Phase 1 gates finalized: size-limit budget set + tree-shaking canary (gzip), coverage ratcheted to final floor, 66/66 1:1 test invariant, four-gate pipeline green
- [Phase ?]: 02-02: api/AUDIT.md tabulates all 79 registered tagNames (not just 66 component files) — matrices key on tagName like cem-diff.mjs
- [Phase ?]: 02-02: Rename mapping rows PENDING-DECISION — targets (open/close, change/select, change/toggle) confirmed at each rename wave checkpoint (Plans 03-05)
- [Phase ?]: 02-02: Audit gap detector flagged --am-z-toast used in toast css but never defined/@cssprop-tagged — pre-freeze action for Plan 09
- [Phase ?]: 02-03: overlay lifecycle events renamed am-show/am-hide -> am-open/am-close on dropdown/popover/context-menu (D-01/D-04 hard rename); one wave Changeset (minor, pre-1.0); baseline re-committed (D-14)
- [Phase ?]: 02-04: selection events normalized under D-02 change-vs-select split — am-select-option -> am-change (am-option); am-row-select + am-selection-change -> single am-change with aggregate detail { keys } (am-data-grid); old names removed, no alias (D-04); one Changeset; baseline re-committed (D-14)
- [Phase ?]: 02-05: final rename wave (D-03) — tabs am-tab-change -> am-change; combobox select -> searchInTrigger (search-in-trigger) and async -> remote; expand-state am-toggle preserved; old names removed (D-04); one Changeset; baseline re-committed (D-14)
- [Phase ?]: 02-06: established non-exported src/internal/ boundary with 3 shared units — FloatingPositionController, ListboxNavController, option-filter pure module; combobox delegates positioning/nav/filtering behavior-preservingly, Phase 1 tests green with zero edits (API-03/D-07/D-08/D-09/D-10)
- [Phase ?]: 02-06: option-filter is a pure module not a controller (D-07 — stateless); ListboxNav operates on host's _highlightedIndex via callbacks to keep it observable @state and preserve un-clamp-on-replace; autoUpdate left ungated (Phase 3 FIX-02 / Phase 4 PERF-04 seams preserved)
- [Phase ?]: 02-07: select + date-picker delegate dropdown positioning to the shared FloatingPositionController; date-picker date math extracted to pure src/internal/helpers/date-utils.ts (API-03/D-07/D-08). Behavior-preserving — full suite (jsdom+Chromium) green, zero test edits, surface unchanged.
- [Phase ?]: 02-07: select nav kept inline and no shared controller edited — select's element-based wraparound keyboard nav is a different model from combobox's string-clamp ListboxNav, and select has no option filtering; delegating only genuine (positioning) duplication keeps combobox untouched (D-08/A3 discretion).
- [Phase ?]: 02-08: time-picker refactored via pure src/internal/helpers/time-utils.ts (parse/format + clock arithmetic, D-07/D-08). No listbox and no @floating-ui/dom, so neither ListboxNavController nor FloatingPositionController applied (Pitfall 5) — completes the Big-4 refactor. Behavior-preserving: full jsdom+Chromium suite green, zero test edits, surface unchanged.
- [Phase ?]: 02-09: froze public slot/::part()/--am-* token surface (212 global + 54 per-component tokens, 21 slots, 76 parts) as v1.0 contract (D-11); tagged --am-z-toast @cssprop on am-toast-region (freeze-all-documented); final baseline re-committed, diff:surface clean, surface-diff CI stays report-only (D-13)

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- REQUIREMENTS.md coverage counter previously read "27 total," but there are 32 distinct v1 requirement IDs (8 TEST + 5 API + 4 FIX + 4 PERF + 4 FEAT + 3 DOCS + 4 SHIP). Traceability now reflects the true 32; counter corrected.
- Phase 1 (browser-mode coverage instrumentation / provider pinning) and Phase 4a (virtualization a11y) are flagged for `--research-phase` during planning (research: STACK/virtualizer MEDIUM confidence).
- Validation UX policy (hint-text vs error-text precedence, error-clearing) is undecided — settle during Phase 4 spec.
- No form-associated control implements ElementInternals.setValidity — TEST-02 required-field validation deferred to Phase 4 (validation-UX policy)
- am-search-field and am-file-upload are NOT form-associated (no ElementInternals; file-upload has no name) — do not participate in FormData. Finding for validation/form phase.
- ~~02-06: pre-existing tsc --noEmit errors in data-grid.ts (unused _toggleRow params, from commit 2f20e2f/02-04)~~ **RESOLVED** in commit bbe853e — params underscore-prefixed; `tsc --noEmit` exit 0.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-17T22:45:32.305Z
Stopped at: Completed 02-09-PLAN.md (phase 02 closing gate — surface FROZEN)
Resume file: None
