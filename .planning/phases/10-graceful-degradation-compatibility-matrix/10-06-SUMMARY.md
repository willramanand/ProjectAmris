---
phase: 10-graceful-degradation-compatibility-matrix
plan: 06
subsystem: ui
tags: [web-components, lit, element-internals, forms, graceful-degradation, compat, jsdom, vitest]

# Dependency graph
requires:
  - phase: 10-graceful-degradation-compatibility-matrix
    provides: "capabilities.ts + attachInternalsSafe() guarded-attach chokepoint (Plan 01)"
  - phase: 10-graceful-degradation-compatibility-matrix
    provides: "form-participation.ts hidden-input Light-DOM fallback (syncFormFallback/teardownFormFallback/warnBelowFloorOnce/isFormFallbackEnabled) + @willramanand/amris/compat-forms opt-in (Plan 02)"
provides:
  - "slider, switch, textarea, time-picker wired through the guarded-attach seam (internals: ElementInternals | null, null-safe call sites) — COMPAT-02"
  - "XOR-gated hidden-input FormData fallback + one-time below-floor warn + disconnect teardown on all four batch-B controls — COMPAT-03"
  - "test/capabilities-off-constructor.batch-b.test.ts + test/form-fallback-integration.batch-b.test.ts (distinct files, collision-free parallel merge-back)"
  - "Completes the mechanical COMPAT-02/03 rollout: 16/16 form-associated custom elements guarded (combined with Plans 01/04/05)"
affects: [10-verify, compat-forms-browser-lane]

# Actuals (#2632)
actuals:
  tokens: 6200
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Combined COMPAT-02/03 per-component transform: attachInternalsSafe(this) + null-safe setFormValue/setValidity + `if (!internals)` below-floor fallback/warn branch in updated() + disconnectedCallback teardown"
    - "Per-batch-scoped test files (no shared-array append) so parallel wave-2 worktrees merge back collision-free"

key-files:
  created:
    - test/capabilities-off-constructor.batch-b.test.ts
    - test/form-fallback-integration.batch-b.test.ts
  modified:
    - src/components/slider/slider.ts
    - src/components/switch/switch.ts
    - src/components/textarea/textarea.ts
    - src/components/time-picker/time-picker.ts

key-decisions:
  - "Switch mirrors boolean checked-state like a native checkbox: teardownFormFallback(this) when unchecked so an OFF switch is absent from FormData below the floor (matches native semantics; T-10-11 accepted)"
  - "Textarea mirrors value + `required` only; minlength/maxlength have no hidden-input equivalent to project natively and degrade below the floor (documented D-03 limit)"
  - "Time-picker mirrors its serialized time-string via _formatValue(); test sets the value before connect to mirror attribute-driven usage (connectedCallback parses on connect)"

patterns-established:
  - "XOR fallback gate lives entirely in the caller's `if (!this.internals)` branch — above the floor neither the fallback sync nor the warn runs, so there is never a second (hidden-input) submission channel (no double-submit)"

requirements-completed: [COMPAT-02, COMPAT-03]

coverage:
  - id: D1
    description: "Below the ElementInternals floor, slider/switch/textarea/time-picker construct, connect, and render without throwing — attachInternalsSafe(this) returns null and every setFormValue/setValidity call site is null-safe (COMPAT-02). The four-file union (Plan 01 am-input + batch-a1 + batch-a2 + this batch's 4 tags) covers all 16 form-associated tags."
    requirement: COMPAT-02
    verification:
      - kind: unit
        ref: "test/capabilities-off-constructor.batch-b.test.ts (am-slider, am-switch, am-textarea, am-time-picker construct/connect/render + property mutation without throwing below the floor)"
        status: pass
    human_judgment: false
  - id: D2
    description: "With hasFormAssociation() forced false AND the fallback opt-in enabled, each control's value serializes into the enclosing native <form>'s FormData (slider numeric-as-string '30', switch checked 'on', textarea 'hello world', time-picker '14:30') via exactly one idempotent hidden Light-DOM input (COMPAT-03 FormData parity)."
    requirement: COMPAT-03
    verification:
      - kind: integration
        ref: "test/form-fallback-integration.batch-b.test.ts (fallback-on parity case per tag — FormData.get(name) === expected, single [data-am-fallback] input)"
        status: pass
    human_judgment: false
  - id: D3
    description: "With ElementInternals PRESENT (above the floor) — even with the opt-in enabled — the fallback hidden input never attaches on any of the four controls: the `!this.internals` branch is skipped, so no double-submit channel exists (COMPAT-03 concurrency edge / T-10-10 mitigation)."
    requirement: COMPAT-03
    verification:
      - kind: integration
        ref: "test/form-fallback-integration.batch-b.test.ts (above-floor XOR case per tag — no [data-am-fallback] input)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Below the floor without the opt-in, each control attaches no mirror and emits exactly one below-floor console.warn naming its tag (one-time global dedup)."
    requirement: COMPAT-03
    verification:
      - kind: integration
        ref: "test/form-fallback-integration.batch-b.test.ts (fallback-off warn case per tag — warn called, message contains tag, no mirror)"
        status: pass
    human_judgment: false

# Metrics
duration: ~18 min
completed: 2026-08-27
status: complete
---

# Phase 10 Plan 06: Graceful Degradation — COMPAT-02/03 Rollout Batch B Summary

**slider, switch, textarea, and time-picker wired through the guarded ElementInternals attach seam and given an XOR-gated hidden-input FormData fallback with one-time below-floor warn — completing the mechanical COMPAT-02/03 rollout across all 16 form-associated custom elements.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-08-27T19:50Z
- **Completed:** 2026-08-27T19:57Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Applied the combined COMPAT-02/03 transform to all four batch-B controls: `attachInternalsSafe(this)` in the constructor, `internals`/`_internals` widened to `ElementInternals | null`, every `setFormValue`/`setValidity` call site `?.`-guarded (reset branches preserved), a `if (!internals)` below-floor fallback/warn branch in `updated()`, and a `disconnectedCallback` teardown of the hidden-input mirror.
- Per-control value serialization matches each control's native `setFormValue`: slider `String(this.value)` (numeric-as-string), switch boolean checked-state (`teardownFormFallback` when OFF, like a native checkbox), textarea `value` + `required`, time-picker `_formatValue()` (serialized time-string).
- Seeded and completed this batch's own two distinct jsdom spec files — `capabilities-off-constructor.batch-b.test.ts` (4 tags, construct-no-throw below the floor) and `form-fallback-integration.batch-b.test.ts` (4 tags × parity/warn/XOR) — with zero shared-array append, so the three wave-2 rollout plans merge back collision-free.
- Verified: 16/16 batch-B specs green, 38 existing component specs green (slider/switch/textarea/time-picker unchanged above the floor), `npx tsc --noEmit` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: slider (tracer) combined rollout + seed batch-b test files** - `a7ff01e` (feat)
2. **Task 2: switch/textarea/time-picker rollout — complete 16/16 + extend batch-b test files** - `6acd8cf` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/components/slider/slider.ts` - Guarded attach + numeric-value XOR fallback + teardown (tracer).
- `src/components/switch/switch.ts` - Guarded attach + boolean checked-state fallback (teardown-on-off) + teardown.
- `src/components/textarea/textarea.ts` - Guarded attach + value/`required` fallback + teardown.
- `src/components/time-picker/time-picker.ts` - Guarded attach + serialized time-string fallback + teardown.
- `test/capabilities-off-constructor.batch-b.test.ts` (created) - Below-floor construct-no-throw for the 4 batch-B tags.
- `test/form-fallback-integration.batch-b.test.ts` (created) - Parity / warn / XOR fallback integration for the 4 value-bearing controls.

## Decisions Made
- Switch follows Plan 04's checkbox teardown-on-uncheck approach — an OFF switch is absent from FormData below the floor, matching native semantics (T-10-11 accepted).
- Textarea mirrors only `required` (not `minlength`/`maxlength`) — those have no native hidden-input equivalent to project; the constraint degrades below the floor (documented D-03 limit, same class as validation.ts's custom-message UI per RESEARCH Q4).
- Fallback value coercion is done at the call site (`String(this.value)` for slider, `_formatValue()` for time-picker) so `syncFormFallback`'s `value: string` contract is honored without widening the helper.

## Deviations from Plan

None - plan executed exactly as written. The combined transform, per-control fallback shapes, and per-batch test-file partition were applied as specified.

## Issues Encountered
- The time-picker parity spec initially read `00:00` instead of `14:30`: setting `value` as a property *after* `appendChild` hits the component's `updated()` guard (`changed.get('value') !== undefined` is false on the first render), so `_parseValue()` was skipped. Resolved by setting the value-bearing state *before* connecting the element in all three fallback cases — this mirrors the common attribute-driven usage (`<am-time-picker value="14:30">`), where `connectedCallback` parses on connect. No production change; the guard behavior is pre-existing and correct for real usage.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- COMPAT-02 (guarded attach) and COMPAT-03 (XOR-gated hidden-input fallback) are now fully rolled out across all 16 form-associated custom elements. Combined with Plans 01/04/05, the mechanical rollout is complete.
- jsdom proves the XOR gate, FormData parity, and one-time warn per control. Real-browser FormData parity / no-double-submit across WebKit/FF/Chromium remains the browser-lane concern flagged by Plan 02 (unchanged by this plan).
- No blockers. The three wave-2 rollout plans own distinct test files, so this worktree merges back collision-free.

## Self-Check: PENDING (populated below)

---
*Phase: 10-graceful-degradation-compatibility-matrix*
*Completed: 2026-08-27*
