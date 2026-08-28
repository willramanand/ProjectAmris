---
phase: 10-graceful-degradation-compatibility-matrix
plan: 04
subsystem: forms
tags: [web-components, lit, element-internals, forms, formdata, graceful-degradation, compat, jsdom, playwright]

# Dependency graph
requires:
  - phase: 10-graceful-degradation-compatibility-matrix
    provides: "capabilities.ts hasFormAssociation() + attachInternalsSafe() (Plan 01); form-participation.ts fallback helpers + compat-forms opt-in (Plan 02)"
provides:
  - "am-input below-floor form-participation fallback branch + disconnectedCallback teardown (completes its degradation story)"
  - "button/checkbox/combobox/color-picker/date-picker migrated to attachInternalsSafe + ElementInternals | null with every call site null-safed (COMPAT-02)"
  - "XOR-gated Light-DOM hidden-input fallback wired into checkbox/combobox/color-picker/date-picker; button gets guard + one-time warn (COMPAT-03)"
  - "form-participation.ts corrected: mirror is a hidden-attribute text input (constraint-validation candidate), not type=hidden — required/pattern now block native submit"
  - "test/capabilities-off-constructor.batch-a1.test.ts (5 tags) + test/form-fallback-integration.batch-a1.test.ts (6 controls) + test/browser/form-fallback.test.ts"
affects: [10-05, 10-06, 10-07]

# Actuals (#2632)
actuals:
  tokens: 6200
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-component XOR degradation wiring: below-floor branch gated on `!this.internals`/`!this._internals` calling isFormFallbackEnabled() ? syncFormFallback(...) : warnBelowFloorOnce(tag), running every updated() pass so name/required/pattern/disabled stay mirrored"
    - "disconnectedCallback teardownFormFallback(this) on every value-bearing control (idempotent no-op above the floor)"
    - "Checkbox teardown-on-uncheck so an unchecked box is ABSENT from FormData (native <input type=checkbox> parity, threat T-10-09)"
    - "Extensible test tables: FALLBACK_TAGS / FORM_TAGS arrays owned solely by one plan (collision-free wave-2 merge-back)"

key-files:
  created:
    - test/capabilities-off-constructor.batch-a1.test.ts
    - test/form-fallback-integration.batch-a1.test.ts
    - test/browser/form-fallback.test.ts
  modified:
    - src/components/input/input.ts
    - src/components/button/button.ts
    - src/components/checkbox/checkbox.ts
    - src/components/combobox/combobox.ts
    - src/components/color-picker/color-picker.ts
    - src/components/date-picker/date-picker.ts
    - src/internal/helpers/form-participation.ts
    - test/form-participation.test.ts

key-decisions:
  - "form-participation.ts mirror changed from `type=\"hidden\"` to a default (text) input hidden via the `hidden` attribute + tabindex=-1: a hidden-TYPE input is BARRED from constraint validation (willValidate=false), so required/pattern could not block native submit — defeating the D-03 value+validation contract this plan must prove. The `hidden`-attribute text input is a validation candidate AND still serializes into FormData. RESEARCH Q4 explicitly sanctioned this alternative."
  - "Checkbox mirrors `value` only when checked and tears the mirror down when unchecked (T-10-09 accept), so an unchecked checkbox is absent from FormData exactly like a native checkbox."
  - "button gets attachInternalsSafe + `.form` null-safe + warnBelowFloorOnce only — no hidden-input fallback (a submit/reset button has no value to mirror)."

patterns-established:
  - "Combined COMPAT-02 + COMPAT-03 per-file rollout in a single edit pass (guarded attach + below-floor fallback/warn), one component at a time"
  - "Below-floor branch is entered ONLY when internals is null — the same guard that gates setFormValue above — making the two channels structurally exclusive (no double-submit)"

requirements-completed: [COMPAT-02, COMPAT-03]

coverage:
  - id: D1
    description: "am-input's full degradation story: below-floor XOR-gated fallback (FormData parity + one idempotent mirror), one-time warn when opt-out, teardown on disconnect; above-floor behavior unchanged"
    requirement: COMPAT-03
    verification:
      - kind: integration
        ref: "test/form-fallback-integration.batch-a1.test.ts#am-input (3 cases: parity ON, warn OFF, XOR above floor)"
        status: pass
      - kind: e2e
        ref: "test/browser/form-fallback.test.ts (real Chromium FormData parity + native required/pattern blocking)"
        status: pass
    human_judgment: false
  - id: D2
    description: "button/checkbox/combobox/color-picker/date-picker migrated to attachInternalsSafe with ElementInternals | null; construct/connect/render below the floor without throwing (COMPAT-02)"
    requirement: COMPAT-02
    verification:
      - kind: integration
        ref: "test/capabilities-off-constructor.batch-a1.test.ts (5 tags construct-without-throw below the floor)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (exit 0 — widened | null propagates cleanly)"
        status: pass
    human_judgment: false
  - id: D3
    description: "checkbox/combobox/color-picker/date-picker below-floor fallback: FormData parity when enabled, one-time warn when disabled, XOR (no mirror above the floor); checkbox unchecked is absent from FormData"
    requirement: COMPAT-03
    verification:
      - kind: integration
        ref: "test/form-fallback-integration.batch-a1.test.ts#am-checkbox/am-combobox/am-color-picker/am-date-picker (3 cases each)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Above-floor behavior of all 6 components (event cadence, DOM, validation timing) unchanged — the freeze holds except the new below-floor branch"
    requirement: COMPAT-02
    verification:
      - kind: integration
        ref: "test/components/{button,button-group,icon-button,link-button,checkbox,combobox,color-picker,date-picker,input}.test.ts (69 + 12 above-floor specs green unchanged)"
        status: pass
      - kind: e2e
        ref: "test/browser/form-association.test.ts (30 native-ElementInternals specs green unchanged)"
        status: pass
    human_judgment: false
  - id: D5
    description: "form-participation.ts native constraint validation actually blocks below the floor (required/pattern projected onto a validation-eligible mirror)"
    requirement: COMPAT-03
    verification:
      - kind: e2e
        ref: "test/browser/form-fallback.test.ts (form.checkValidity() false while required-empty / pattern-mismatch, true once satisfied)"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-08-27
status: complete
---

# Phase 10 Plan 04: Graceful Degradation — COMPAT-02 + COMPAT-03 Batch A1 Summary

**Six form-associated components (am-input tracer + button, checkbox, combobox, color-picker, date-picker) made fully degradation-capable below the Safari 16.4 floor: guarded ElementInternals attach plus an XOR-gated Light-DOM hidden-input fallback with FormData parity, one-time dev warning, and — via a corrected mirror that is now a constraint-validation candidate — real native `required`/`pattern` blocking proven in Chromium.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-28T00:01:22Z
- **Tasks:** 2 (Task 1 tracer, Task 2 five-file rollout)
- **Files modified:** 11 (3 created, 8 modified)

## Accomplishments
- **am-input tracer (Task 1):** added the XOR-gated below-floor branch in `updated()` (`isFormFallbackEnabled() ? syncFormFallback(...) : warnBelowFloorOnce('am-input')`, entered only when `internals` is null) and a `disconnectedCallback` teardown. Proven end-to-end: jsdom parity/warn/XOR + a new Chromium spec asserting real `FormData` parity and native `required`/`pattern` blocking.
- **Five-file rollout (Task 2):** button, checkbox, combobox, color-picker, date-picker migrated to `attachInternalsSafe(this)` + `ElementInternals | null` with every `setFormValue`/`setValidity`/`.form` site null-safed (COMPAT-02). The four value-bearing controls gained the same XOR fallback branch + teardown (COMPAT-03); button got guard + one-time warn only (no value to mirror).
- **Corrected the fallback mirror (deviation):** `form-participation.ts` no longer builds a `type="hidden"` input (barred from constraint validation, so `required`/`pattern` never blocked) — it now builds a default text input hidden via the `hidden` attribute + `tabindex="-1"`, which stays a validation candidate AND still serializes into `FormData`. Empirically verified in the browser lane.
- **Coverage:** batch-A1 constructor-no-throw file (5 tags) + batch-A1 fallback-integration file (6 controls × 3 cases) + browser form-fallback spec. Combined with Plan 01 (am-input) these cover 6 of the 16 form-associated tags; Plans 05/06 complete the remaining 9 on their own distinct files.

## Task Commits

1. **Task 1: am-input below-floor fallback + form-participation mirror fix (tracer)** - `f680992` (feat)
2. **Task 2: combined rollout to button/checkbox/combobox/color-picker/date-picker** - `de276ac` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/components/input/input.ts` - Below-floor XOR fallback branch in `updated()` + `disconnectedCallback` teardown.
- `src/components/button/button.ts` - `attachInternalsSafe`, `ElementInternals | null`, `.form` null-safe, `warnBelowFloorOnce('am-button')` below floor.
- `src/components/checkbox/checkbox.ts` - Guarded attach + null-safe sites + XOR fallback (teardown-on-uncheck) + teardown.
- `src/components/combobox/combobox.ts` - Guarded attach + null-safe sites + XOR fallback + teardown.
- `src/components/color-picker/color-picker.ts` - Guarded attach + null-safe sites + XOR fallback + teardown.
- `src/components/date-picker/date-picker.ts` - Guarded attach + null-safe sites + XOR fallback (mirrors serialized value) + teardown.
- `src/internal/helpers/form-participation.ts` - Mirror changed from `type="hidden"` to a `hidden`-attribute text input (+ `tabindex=-1`) so native constraint validation blocks (deviation).
- `test/form-participation.test.ts` - Updated the type-assertion to match the corrected mirror (deviation).
- `test/capabilities-off-constructor.batch-a1.test.ts` (created) - 5-tag construct-without-throw below the floor.
- `test/form-fallback-integration.batch-a1.test.ts` (created) - 6 controls × {parity ON, warn OFF, XOR above floor}.
- `test/browser/form-fallback.test.ts` (created) - Real-browser FormData parity + native required/pattern blocking.

## Decisions Made
- **Hidden mirror is a validation-eligible input, not `type="hidden"`** — see Deviations; this is what makes D-03's native-validation half real.
- **Checkbox teardown-on-uncheck** — an unchecked checkbox is absent from FormData (native parity, T-10-09), rather than syncing a divergent empty value.
- **button warn-only** — a submit/reset button has no value channel, so it gets the guarded attach + DX warning but no hidden-input fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / Rule 3 - Blocking] `form-participation.ts` mirror could not enforce native validation as `type="hidden"`**
- **Found during:** Task 1 (writing the browser `required`/`pattern`-blocking proof)
- **Issue:** Plan 02's shipped mirror set `input.type = 'hidden'`. An HTML `type="hidden"` input is **barred from constraint validation** (`willValidate === false`), so projecting `required`/`pattern` onto it does NOT block a native submit — directly contradicting this plan's acceptance criterion "native required-blocking for the light-DOM mirror" and must_have truth #2. Empirically confirmed in Chromium (a throwaway probe: `type=hidden` required-empty → `reportValidity()` true / does not block; a `hidden`-attribute text input → false / blocks, and still serializes into FormData).
- **Fix:** Removed `input.type = 'hidden'`; the mirror is now a default (text) input made non-visual via `input.hidden = true` + `input.tabIndex = -1` (kept `aria-hidden`, the reserved `data-am-fallback` marker, and the one-way sync discipline). It remains a constraint-validation candidate (required/pattern block) AND is still serialized into FormData. RESEARCH Q4 explicitly offered this "hidden text input carrying constraints" alternative.
- **Files modified:** src/internal/helpers/form-participation.ts, test/form-participation.test.ts (its `input.type === 'hidden'` assertion updated to `'text'` + `tabIndex === -1`).
- **Verification:** test/form-participation.test.ts (5/5) green; test/browser/form-fallback.test.ts proves `checkValidity()` blocks a required-empty / pattern-mismatch mirror and passes once satisfied; FormData parity retained in jsdom and Chromium.
- **Committed in:** f680992 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/blocking — corrects the shipped fallback so its D-03 native-validation contract is actually met).
**Impact on plan:** Necessary to satisfy this plan's own acceptance criteria and must_have truths. It changes the DOM shape of the below-floor mirror (observable only when the opt-in `@willramanand/amris/compat-forms` is imported AND the engine is below the floor) from a `type=hidden` to a `hidden`-attribute text input; FormData behavior is unchanged, native validation now works. No public CEM surface change. Plans 05/06 reuse the corrected helper unchanged.

## Issues Encountered
- The worktree was created without `node_modules`; created a directory junction to the main repo's `node_modules` (matching Plan 01) so vitest/tsc/playwright could run in-worktree. Runtime/tooling only — no source impact.

## Threat Flags
None — no new network endpoints, auth paths, or trust boundaries introduced. The plan's own threat register (T-10-08 double-submit mitigated by the per-component `!internals` XOR guard; T-10-09 checkbox unchecked-omission accepted via teardown-on-uncheck) is satisfied and re-verified by the XOR test cases.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 6 of 16 form-associated components are fully degradation-capable. Plan 05 (batch A2: input-otp, number-field, radio, rich-select, select) and Plan 06 (batch B: 4 components) can mechanically apply the same combined pattern, each on its own distinct test files; they reuse the corrected `form-participation.ts` unchanged.
- **Carry-forward for the phase verifier / Plan 07:** `form-participation.ts`'s below-floor mirror is now a `hidden`-attribute text input (not `type=hidden`). A required-empty mirror correctly blocks native submit; browsers may log the standard "An invalid form control is not focusable" console message when a hidden required control blocks — expected below-floor behavior, not a bug. Plan 07 widens `test/browser/form-fallback.test.ts` to WebKit/Firefox.

## Self-Check: PASSED

- Created files verified on disk: `test/capabilities-off-constructor.batch-a1.test.ts`, `test/form-fallback-integration.batch-a1.test.ts`, `test/browser/form-fallback.test.ts`, `10-04-SUMMARY.md`.
- Commits verified: `f680992` (Task 1 feat), `de276ac` (Task 2 feat).
- Verifications green: jsdom (batch-a1 constructor 5, fallback-integration 18, capabilities-off am-input, form-participation 6, compat-forms, capabilities → 32 across the fallback/capability suites; component above-floor suites 69 + 12); browser (form-fallback 3 + form-association 30 = 33); `npx tsc --noEmit` exit 0.

---
*Phase: 10-graceful-degradation-compatibility-matrix*
*Completed: 2026-08-27*
