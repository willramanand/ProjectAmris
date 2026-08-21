---
phase: 02-api-cleanup-cem-baseline
plan: 06
subsystem: ui
tags: [web-components, lit, reactive-controller, floating-ui, combobox, refactor, internal-boundary]

# Dependency graph
requires:
  - phase: 02-api-cleanup-cem-baseline (Plan 01)
    provides: CEM baseline snapshot + cem-diff.mjs comparator + diff:surface script
  - phase: 02-api-cleanup-cem-baseline (Plan 05)
    provides: combobox prop names finalized (searchInTrigger, remote) — the surface this refactor delegates behind
provides:
  - Non-exported src/internal/ boundary with three shared Lit Reactive Controllers/modules (D-07/D-08/D-09)
  - FloatingPositionController — computePosition + ungated autoUpdate lifecycle, per-host options
  - ListboxNavController — Arrow/Enter/Escape/Tab + highlightedIndex movement, un-clamp-on-replace preserved
  - option-filter pure module — stateless client-side option filtering with remote gating
  - combobox refactored to delegate positioning, listbox nav, and filtering behavior-preservingly (API-03)
affects: [02-api-cleanup-cem-baseline Plan 07 (expand controllers to select), Plan 08 (date-picker/time-picker), Phase 3 FIX-02 (un-clamp fix), Phase 4 PERF-04 (autoUpdate gating)]

actuals:
  tokens: 4763
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Non-exported src/internal/ boundary for shared machinery — registers no custom element, off the frozen CEM surface (D-09)"
    - "Lit ReactiveController via host.addController(this) in a field initializer; hostDisconnected mirrors the host's teardown"
    - "Per-host options object (accessor callbacks + placement/strategy/offset + extra middleware) so one floating controller serves differently-anchored overlays"
    - "Pure module (not a controller) for stateless logic per D-07 — option-filter is a plain function"
    - "Behavior-preserving refactor gate: characterization tests stay GREEN with zero test edits (D-10)"

key-files:
  created:
    - src/internal/controllers/floating-position.ts
    - src/internal/controllers/listbox-nav.ts
    - src/internal/controllers/option-filter.ts
  modified:
    - src/components/combobox/combobox.ts

key-decisions:
  - "option-filter is a pure module, not a ReactiveController (D-07) — filtering is stateless; the remote flag is a caller-supplied boolean, nothing to hook into the host update cycle"
  - "ListboxNavController reads/writes the host's own _highlightedIndex via accessor callbacks rather than owning the index — keeps it the host's @state (observable to TEST-04's direct _highlightedIndex reads) and preserves the un-clamp-on-replace bug exactly"
  - "The document 'click' outside-close listener stays host-owned (not moved into FloatingPositionController) — TEST-05 spies on it and the controller's scope is positioning only"
  - "combobox retains its size (width-match) middleware, appended to the shared offset/flip/shift base stack; the middleware instance is created once in the field initializer"

patterns-established:
  - "src/internal/ boundary: never added to src/index.ts, src/index.all.ts, or package.json exports; CEM tagName set unchanged (controllers add no element)"
  - "Refactor tracer: prove controller decomposition against the heaviest real consumer (combobox) with green characterization tests before expanding to other components"

requirements-completed: [API-03]

coverage:
  - id: D1
    description: "Non-exported src/internal/ boundary + FloatingPositionController (ReactiveController wrapping computePosition + ungated autoUpdate); combobox delegates positioning behavior-preservingly"
    requirement: "API-03"
    verification:
      - kind: unit
        ref: "test/components/combobox.test.ts (13 jsdom tests incl. open/close, positioning lifecycle) — pass, test file unchanged"
        status: pass
      - kind: other
        ref: "grep -c 'autoUpdate(' src/components/combobox/combobox.ts => 0 (only in controller); node exports-has-no-internal check => pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "ListboxNavController (Arrow/Enter/Escape/Tab + highlightedIndex, un-clamp-on-replace preserved) + option-filter pure module; combobox delegates keydown nav + filtering"
    requirement: "API-03"
    verification:
      - kind: unit
        ref: "test/components/combobox.test.ts (ArrowDown/Up + Enter select; TEST-04 dynamic option-update index clamp; remote am-search) — pass, test file unchanged"
        status: pass
      - kind: other
        ref: "grep -rnE 'innerHTML|eval\\(' src/internal => zero hits"
        status: pass
    human_judgment: false
  - id: D3
    description: "Behavior-preservation gate — full jsdom + Chromium suite green with zero test edits, src/internal non-exported, CEM surface unchanged"
    requirement: "API-03"
    verification:
      - kind: integration
        ref: "npm run test:run (481 jsdom pass) + npm run test:browser (39 Chromium pass)"
        status: pass
      - kind: other
        ref: "npm run build:manifest && npm run diff:surface => 'No surface drift'; grep internal/ in barrels => zero; baseline unchanged"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-17
status: complete
---

# Phase 2 Plan 06: Reactive Controller Extraction (combobox tracer) Summary

**Established the non-exported src/internal/ boundary with three shared units — FloatingPositionController, ListboxNavController, and an option-filter pure module — and refactored combobox to delegate positioning, listbox keyboard nav, and filtering to them, behavior-preservingly, with the Phase 1 characterization tests green and zero test edits.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-17T04:18:57Z
- **Completed:** 2026-08-17T04:24:07Z
- **Tasks:** 3 (Task 3 is a verification-only gate — no source edits, no commit)
- **Files modified:** 4 (3 created + 1 modified)

## Accomplishments
- Created the greenfield non-exported `src/internal/` boundary and `FloatingPositionController`, a Lit `ReactiveController` wrapping the `computePosition` + `autoUpdate` lifecycle that was duplicated inline across 9 overlay components. It takes per-host accessor callbacks (`reference()`/`floating()`), placement, optional strategy, offset, and appended middleware — accommodating combobox's `size` width-matcher and dropdown's plain stack alike.
- Refactored combobox positioning to delegate `start()`/`stop()` to the controller from `updated()` using the SAME open gating it had inline; removed the inline `_startAutoUpdate`/`_updatePosition`/`_cleanupAutoUpdate`. `autoUpdate` now appears only in the controller (`grep autoUpdate( combobox.ts` => 0).
- Added `ListboxNavController` (Arrow/Enter/Escape/Tab + `_highlightedIndex` movement) and the `option-filter` pure module (client-side filter with `remote` gating). combobox's `_handleKeydown` now delegates to the controller, and all three filter sites route through `filterOptions`.
- Preserved the two Phase 3/4 seams EXACTLY: `autoUpdate` stays ungated (PERF-04), and `_highlightedIndex` is not re-clamped on option replace (FIX-02). Both are captured for later phases, not fixed here.
- Proved behavior-preservation end-to-end: full jsdom suite (481) and Chromium lane (39) green with ZERO test edits (D-10); `diff:surface` reports no surface drift; the CEM tagName set is unchanged; `src/internal/` is absent from both barrels and `package.json` exports; `api/custom-elements.baseline.json` untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Establish src/internal/ + FloatingPositionController, wire combobox positioning** - `0e4a3ae` (refactor)
2. **Task 2: ListboxNavController + option-filter module, wire combobox nav + filtering** - `629f198` (refactor)
3. **Task 3: Behavior-preservation gate (full suite, surface diff, boundary checks)** - no commit (verification-only, no source edits)

**Tracer feedback gate:** After Task 1, the tracer's fully-automated `<verify>` (tsc clean for combobox, 13/13 combobox tests green, grep gates clean, exports clean) was re-run end-to-end and passed. As the refactor is behavior-preserving with no human/visual element and the project's `human_verify_mode` is `end-of-phase`, the foundation was confirmed and execution expanded to Task 2.

## Files Created/Modified
- `src/internal/controllers/floating-position.ts` - FloatingPositionController: `computePosition` + ungated `autoUpdate` lifecycle, per-host options, `hostDisconnected` teardown.
- `src/internal/controllers/listbox-nav.ts` - ListboxNavController: Arrow/Enter/Escape/Tab + highlighted-index movement via host accessor callbacks; un-clamp-on-replace preserved.
- `src/internal/controllers/option-filter.ts` - Pure `filterOptions(options, query, remote)` module (D-07): stateless case-insensitive client-side filter with remote gating.
- `src/components/combobox/combobox.ts` - Delegates positioning, keydown nav, and filtering to the three units; inline machinery removed; the document outside-click listener and event dispatches remain host-owned.

## Decisions Made
- **option-filter as a pure module, not a controller (D-07):** filtering is stateless — the only "async gating" concern is the `remote` boolean, which is caller-supplied, not lifecycle state. A plain function fit the real call sites better than a ReactiveController.
- **ListboxNavController operates on the host's `_highlightedIndex` via accessor callbacks** rather than owning the index internally. TEST-04 reads/writes `el._highlightedIndex` directly, so the index must remain the host's `@state`; the controller mutates it through `getIndex`/`setIndex`. This also preserves the un-clamp-on-replace behavior byte-for-byte.
- **The document `click` outside-close listener stayed host-owned** — it is not positioning, TEST-05 spies on it via `_handleDocumentClick`, and moving it into the floating controller would change its observable attach/detach shape.

## Deviations from Plan

None — plan executed exactly as written. All three prohibitions were honored: `autoUpdate` left ungated, `_highlightedIndex` un-clamp-on-replace preserved, and `src/internal/` kept out of all barrels and exports. No test file was edited (the unchanged characterization suite is the acceptance signal).

## Issues Encountered
- **Pre-existing `tsc --noEmit` errors in `src/components/data-grid/data-grid.ts`** (TS6133: unused `row` / `originalIndex` params in `_toggleRow`). Confirmed present on HEAD (introduced in commit 2f20e2f / Plan 02-04), unrelated to the combobox refactor. Per the SCOPE BOUNDARY rule, this out-of-scope failure was NOT fixed; logged to `.planning/phases/02-api-cleanup-cem-baseline/deferred-items.md`. This plan's own changes are type-clean (`tsc --noEmit` reports zero errors outside data-grid). The runtime characterization suites (jsdom + Chromium) are unaffected and fully green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The `src/internal/` boundary and the controller decomposition pattern are proven against the heaviest real consumer. Plans 07/08 can now expand delegation to select, date-picker, and time-picker as mechanical work against a proven seam.
- Phase 3 (FIX-02, `_highlightedIndex` re-clamp) and Phase 4 (PERF-04, `autoUpdate` gating) seams are preserved intact and clearly localized in `listbox-nav.ts` and `floating-position.ts` respectively.
- Deferred: pre-existing data-grid tsc errors (see deferred-items.md) should be addressed before the Plan 09 freeze / any `npm run build`.

## Self-Check: PASSED

- FOUND: src/internal/controllers/floating-position.ts
- FOUND: src/internal/controllers/listbox-nav.ts
- FOUND: src/internal/controllers/option-filter.ts
- FOUND: .planning/phases/02-api-cleanup-cem-baseline/02-06-SUMMARY.md
- FOUND commit: 0e4a3ae (Task 1)
- FOUND commit: 629f198 (Task 2)

---
*Phase: 02-api-cleanup-cem-baseline*
*Completed: 2026-08-17*
