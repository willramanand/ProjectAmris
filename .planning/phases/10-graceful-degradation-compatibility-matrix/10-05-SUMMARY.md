---
phase: 10-graceful-degradation-compatibility-matrix
plan: 05
subsystem: infra
tags: [web-components, lit, element-internals, graceful-degradation, form-participation, jsdom, vitest, compat]

# Dependency graph
requires:
  - phase: 10-graceful-degradation-compatibility-matrix
    provides: "capabilities.ts + attachInternalsSafe (Plan 01) and form-participation.ts + compat-forms (Plan 02)"
provides:
  - "number-field, input-otp, radio (am-radio + am-radio-group), rich-select, select rolled through the guarded-attach seam (COMPAT-02) with null-safe setFormValue/setValidity"
  - "XOR-gated below-floor hidden-input form-participation fallback wired into each value-bearing batch-A2 control (COMPAT-03), with am-radio teardown-on-deselect (T-10-09b)"
  - "test/capabilities-off-constructor.batch-a2.test.ts — 6-tag constructor-no-throw harness (owned solely by Plan 05)"
  - "test/form-fallback-integration.batch-a2.test.ts — per-component fallback-on parity / fallback-off warn / above-floor XOR + am-radio checked-based cases"
affects: [10-06, form-associated-component-rollout]

# Actuals (#2632)
actuals:
  tokens: 8600
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Combined per-file transform: widen internals to `ElementInternals | null`, `attachInternalsSafe(this)`, `?.` at every setter, below-floor `isFormFallbackEnabled() ? syncFormFallback(...) : warnBelowFloorOnce(tag)` branch gated on `!internals`, `disconnectedCallback` teardown"
    - "Radio teardown-on-deselect: an unselected radio below the floor is ABSENT from FormData (mirror removed rather than present-but-empty), matching native radio semantics"

key-files:
  created:
    - test/capabilities-off-constructor.batch-a2.test.ts
    - test/form-fallback-integration.batch-a2.test.ts
  modified:
    - src/components/number-field/number-field.ts
    - src/components/input-otp/input-otp.ts
    - src/components/radio/radio.ts
    - src/components/rich-select/rich-select.ts
    - src/components/select/select.ts

key-decisions:
  - "number-field mirrors its own null-guarded serialization (`this.value != null ? String(this.value) : ''`) into the fallback rather than a bare `String(this.value)`, so a null numeric value never submits the literal string 'null' — only `required` is projected (min/max/step have no hidden-input equivalent, RESEARCH.md Q4)"
  - "am-radio IS value-bearing (it calls setFormValue on checked change), so it received a full fallback branch — not guard+warn-only — using teardown-on-deselect to honor threat T-10-09b; am-radio-group also value-bearing"
  - "am-radio kept OUT of the generic setValue FALLBACK_TAGS loop (its checked-based API doesn't fit value-set) and given a dedicated present-when-checked / absent-when-deselected + XOR block instead"

patterns-established:
  - "Per-batch distinct jsdom test files (batch-a2) so parallel wave-2 plans never append to a shared tag-array file (collision-free merge-back)"
  - "Fallback-integration scaffold with a per-tag value adapter (numeric property, OTP `_values` state, string `value`) driving one FormData-parity + warn + XOR trio per control"

requirements-completed: [COMPAT-02, COMPAT-03]

coverage:
  - id: D1
    description: "Below the floor, all 6 attach sites across the 5 batch-A2 files (number-field, input-otp, am-radio, am-radio-group, rich-select, select) construct, connect, and render without throwing (COMPAT-02)"
    requirement: COMPAT-02
    verification:
      - kind: unit
        ref: "test/capabilities-off-constructor.batch-a2.test.ts#<tag> constructs, connects, and renders without throwing when form association is absent (6 tags)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Below the floor with fallback enabled, each value-bearing control (number-field, input-otp, radio-group, rich-select, select) serializes its value into the native form's FormData with above-floor parity (COMPAT-03)"
    requirement: COMPAT-03
    verification:
      - kind: unit
        ref: "test/form-fallback-integration.batch-a2.test.ts#<tag> — below floor with fallback enabled mirrors its value into FormData (5 tags)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Below the floor with fallback disabled (default), each control warns once (globally deduped) and appends no mirror node"
    requirement: COMPAT-03
    verification:
      - kind: unit
        ref: "test/form-fallback-integration.batch-a2.test.ts#<tag> — below floor with fallback disabled warns once and mirrors nothing (5 tags)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Above the floor (internals present) the hidden-input fallback NEVER attaches even when opted in — the XOR gate proving no double-submit per component (T-10-08b)"
    requirement: COMPAT-03
    verification:
      - kind: unit
        ref: "test/form-fallback-integration.batch-a2.test.ts#<tag> — above the floor never attaches the hidden-input fallback (XOR) (5 tags + am-radio)"
        status: pass
    human_judgment: false
  - id: D5
    description: "am-radio below the floor is present-when-checked and ABSENT-when-deselected in FormData (teardown-on-deselect, native radio semantics, T-10-09b)"
    requirement: COMPAT-03
    verification:
      - kind: unit
        ref: "test/form-fallback-integration.batch-a2.test.ts#below floor + fallback enabled: present-when-checked, absent-when-deselected"
        status: pass
    human_judgment: false
  - id: D6
    description: "Above-floor behavior (event cadence, DOM, a11y, validation timing) of all five components is unchanged — existing jsdom specs stay green and tsc is clean (behavior-freeze except the below-floor branch)"
    requirement: COMPAT-02
    verification:
      - kind: unit
        ref: "test/components/{number-field,input-otp,radio,rich-select,select}.test.ts (115 specs green unchanged)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-27
status: complete
---

# Phase 10 Plan 05: Graceful Degradation — COMPAT-02 + COMPAT-03 Batch A2 Summary

**number-field, input-otp, radio (both classes), rich-select, and select rolled through the guarded ElementInternals attach seam with an XOR-gated below-floor hidden-input form fallback — 6 attach sites degradation-capable, proven on this batch's own distinct jsdom test files.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-27T23:50:05Z
- **Completed:** 2026-08-27T23:57:59Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- Applied the combined COMPAT-02 + COMPAT-03 transform to 5 files / 6 attach sites: widened each internals field to `ElementInternals | null`, replaced raw `attachInternals()` with `attachInternalsSafe(this)`, null-safed every `setFormValue`/`setValidity` call site, added the `!internals`-gated `syncFormFallback` / `warnBelowFloorOnce` branch, and a `disconnectedCallback` mirror teardown.
- Handled am-radio's checked-based semantics with teardown-on-deselect so an unselected radio is absent from FormData below the floor (threat T-10-09b), while both am-radio and am-radio-group received the guarded-attach half.
- Seeded and completed Plan 05's own two batch-a2 jsdom files: a 6-tag constructor-no-throw harness and a per-component fallback-integration suite (fallback-on FormData parity, fallback-off one-time warn, above-floor XOR), plus a dedicated am-radio present/absent block — 27 new specs, all green.
- Held the above-floor freeze: all 115 existing jsdom specs across the five components stay green and `tsc --noEmit` is clean.

## Task Commits

1. **Task 1: number-field guarded-attach + below-floor fallback (tracer) + seed batch-a2 files** - `b1fa717` (feat)
2. **Task 2: guarded-attach + fallback for input-otp, radio (both classes), rich-select, select** - `8266006` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/components/number-field/number-field.ts` (modified) - Guarded attach + numeric-value (null-guarded) fallback + teardown.
- `src/components/input-otp/input-otp.ts` (modified) - Guarded attach + aggregate-OTP-value fallback + teardown.
- `src/components/radio/radio.ts` (modified) - Guarded attach on both AmRadio + AmRadioGroup; am-radio teardown-on-deselect fallback; group value fallback; teardown on both.
- `src/components/rich-select/rich-select.ts` (modified) - Guarded attach + selected-value fallback + teardown.
- `src/components/select/select.ts` (modified) - Guarded attach + selected-value fallback + teardown.
- `test/capabilities-off-constructor.batch-a2.test.ts` (created) - 6-tag below-floor constructor-no-throw harness.
- `test/form-fallback-integration.batch-a2.test.ts` (created) - Per-component fallback parity/warn/XOR + am-radio checked-based cases.

## Decisions Made
- number-field mirrors its own null-guarded serialization into the fallback (never the literal `'null'`); only `required` is projected because min/max/step have no hidden-input constraint equivalent (RESEARCH.md Q4).
- am-radio is genuinely value-bearing (calls `setFormValue` on checked change), so it got a full fallback branch — not guard+warn-only — implemented via teardown-on-deselect (T-10-09b).
- am-radio is excluded from the generic `setValue` fallback loop (its checked-based API doesn't fit value-set) and covered by a dedicated present/absent + XOR block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] am-radio wired with a full fallback branch instead of guard+warn-only**
- **Found during:** Task 2 (radio.ts investigation)
- **Issue:** The plan's FALLBACK_TAGS example anticipated am-radio might be "guard+warn-only like button.ts." The read_first investigation showed `AmRadio.updated()` DOES call `this.internals.setFormValue(this.checked ? this.value : null)` — it is value-bearing. Making it warn-only would drop a lone checked radio's value below the floor and leave threat T-10-09b's documented teardown-on-deselect mitigation unimplemented.
- **Fix:** Gave am-radio a full below-floor fallback branch that syncs the mirror while checked and tears it down on deselect (absent from FormData), matching native radio semantics and the threat register.
- **Files modified:** src/components/radio/radio.ts, test/form-fallback-integration.batch-a2.test.ts
- **Verification:** `test/form-fallback-integration.batch-a2.test.ts` am-radio block (present-when-checked / absent-when-deselected / XOR) passes; existing radio specs green.
- **Committed in:** 8266006 (Task 2 commit)

**2. [Rule 3 - Blocking] number-field fallback value null-guarded rather than bare `String(this.value)`**
- **Found during:** Task 1 (number-field.ts)
- **Issue:** number-field's `value` is `number | null`; the plan text said "coerce via `String(this.value)`", but `String(null)` is `'null'`, which would submit a literal `'null'` string for an empty numeric control instead of an empty value.
- **Fix:** Mirrored the component's own serialization — `this.value != null ? String(this.value) : ''` — fulfilling the plan's "mirror the SAME serialization" instruction.
- **Files modified:** src/components/number-field/number-field.ts
- **Verification:** number-field fallback-on parity test asserts FormData `'42'`; construct-no-throw covers the null path.
- **Committed in:** b1fa717 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking). **Impact:** Both necessary for correctness and to honor the threat register; no scope creep — the above-floor freeze holds.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Batch A is complete (Plan 04 batch A1 + this plan's batch A2 = 11 files). Plan 06 (batch B) finishes the remaining 4 components; combined with Plans 01/04/06 all 16 form-associated tags are covered across the four partitioned constructor-no-throw files.
- The below-floor FormData parity and native `required` blocking are proven in jsdom here; the real-browser WebKit/Firefox lane (COMPAT-04) remains the cross-engine gate as noted in Plan 02.

## Self-Check: PASSED

- Created files verified on disk: `test/capabilities-off-constructor.batch-a2.test.ts`, `test/form-fallback-integration.batch-a2.test.ts`, `10-05-SUMMARY.md`.
- Commits verified in git log: `b1fa717` (Task 1), `8266006` (Task 2).
- Verifications green: `npx vitest run --project jsdom` batch-a2 files + all 5 component specs → 138 passed; `npx tsc --noEmit` → exit 0.

---
*Phase: 10-graceful-degradation-compatibility-matrix*
*Completed: 2026-08-27*
