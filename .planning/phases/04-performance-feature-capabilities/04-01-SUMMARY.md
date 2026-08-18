---
phase: 04-performance-feature-capabilities
plan: 01
subsystem: forms
tags: [validation, elementinternals, aria, lit, reactive-controller, web-components, accessibility]

# Dependency graph
requires:
  - phase: 02
    provides: src/internal boundary convention (ReactiveController seam, non-exported, off the frozen CEM surface)
  - phase: 03
    provides: browser test lane (real Chromium ElementInternals, no setup mock)
provides:
  - ValidationController seam on src/internal (shared D-03 precedence + D-01 timing engine for all 14 form controls)
  - am-input validation UX end-to-end (native validationMessage surfaced, setCustomError public API, same-shadow-root aria-live region)
  - First control to call ElementInternals.setValidity — required-empty now invalidates the host form
  - Three validation test files (jsdom precedence + two Chromium proofs) the expansion plans build on
affects: [04-02, 04-03, 04-04, form-controls, validation-expansion, phase-6-freeze]

# Actuals (#2632)
actuals:
  tokens: 7600
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared ValidationController (ReactiveController) resolving custom-wins message + touch-gated native message"
    - "Control-owned, same-shadow-root aria-live message region wired by aria-describedby/aria-invalid (Open Q-1 Option A)"
    - "Native ElementInternals.setValidity mirrored from the inner input's constraint validity"

key-files:
  created:
    - src/internal/controllers/validation.ts
    - test/components/validation-controller.test.ts
    - test/browser/validation-timing.test.ts
    - test/browser/validation-aria.test.ts
  modified:
    - src/components/input/input.ts
    - test/components/input.test.ts
    - test/browser/form-association.test.ts

key-decisions:
  - "setCustomError(message: string): void lives on each control (Option A) — same-shadow-root by construction; confirmed at checkpoint before freeze"
  - "setCustomError('') clears to the native constraint message; a non-empty custom message wins over native (D-03)"
  - "Native constraint messages are touch-gated (blur / failed submit); custom errors show immediately (D-01)"
  - "Validation reflects :host([invalid]) via the boolean attribute (Safari 16.4 floor), never :state()/CustomStateSet (Pitfall 5)"
  - "invalid-attribute reflection is ownership-tracked so validation does not clobber a consumer-set invalid attribute"

patterns-established:
  - "ValidationController: constructor(host, opts) with accessor-callback opts (internals/anchor) + stable describedById, mirroring floating-position.ts"
  - "Host mirrors inner-input native validity onto internals.setValidity(flags, message, anchor) post-render, then reflects controller.message/invalid into @state"
  - "Message rendered via Lit ${} text binding only — no raw-HTML sink (ASVS V5 / T-04-01)"

requirements-completed: [FEAT-01, FEAT-02]

coverage:
  - id: D1
    description: "ValidationController resolves D-03 custom-wins precedence and D-01 touch-gated native message; never throws; not on the public surface"
    requirement: FEAT-02
    verification:
      - kind: unit
        ref: "test/components/validation-controller.test.ts#ValidationController — D-03 precedence + D-01 timing"
        status: pass
      - kind: other
        ref: "node -e ... assert ValidationController not re-exported from src/index.ts/src/index.all.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-input surfaces native validationMessage + setCustomError('') with D-03 precedence and D-01 timing in the jsdom lane; no first-paint error; :host([invalid]) reflected"
    requirement: FEAT-01
    verification:
      - kind: unit
        ref: "test/components/input.test.ts#validation (jsdom lane)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Same-shadow-root ARIA proven vs real ElementInternals in Chromium: aria-describedby resolves inside the control's own shadowRoot (Pitfall 3); message rendered as text not markup (T-04-01)"
    requirement: FEAT-01
    verification:
      - kind: e2e
        ref: "test/browser/validation-aria.test.ts#validation ARIA + politeness (real ElementInternals)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-01 timing + D-04 politeness proven vs real ElementInternals: no first-paint error, blur surfaces native message + aria-invalid, live-clear on fix, submit surfaces assertively (role=alert)"
    requirement: FEAT-01
    verification:
      - kind: e2e
        ref: "test/browser/validation-timing.test.ts#validation timing (real ElementInternals)"
        status: pass
    human_judgment: false

# Metrics
duration: 13min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 01: Validation Tracer (ValidationController + am-input) Summary

**Shared ValidationController seam plus am-input surfacing native `ElementInternals.validationMessage` and a new `setCustomError()` API in a same-shadow-root `aria-live` region, with D-03 precedence and D-01/D-04 timing/politeness proven against real Chromium ElementInternals.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-08-18T17:20Z
- **Completed:** 2026-08-18T17:33Z
- **Tasks:** 2 implementation tasks (1 gating decision checkpoint resolved by user)
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- Created the non-exported `ValidationController` (`src/internal/`) — the reusable D-03/D-01 engine the other 13 form controls will adopt identically.
- Wired am-input end-to-end: native constraint message surfaced in a control-owned `aria-live` region referenced by `aria-describedby`; inner input drives `aria-invalid`; `:host([invalid])` reflected via `--am-danger`.
- Implemented the confirmed public `setCustomError(message: string): void` (Option A) with custom-wins precedence and `''`-clears-to-native semantics, JSDoc'd for CEM capture.
- am-input is the first library control to call `ElementInternals.setValidity` — a required-empty control now invalidates its host form.
- Proved the load-bearing cross-shadow ARIA mechanism (RESEARCH Open Q-1) against real ElementInternals in Chromium before any expansion.

## Task Commits

1. **Task 2 (tracer, TDD RED): failing ValidationController spec** - `456fa28` (test)
2. **Task 2 (tracer, TDD GREEN): ValidationController + am-input wiring** - `a625aee` (feat)
3. **Task 3: browser-lane proofs vs real ElementInternals** - `23467c1` (test)

_The gating `checkpoint:decision` (Task 1) was resolved by the user (Option A) before implementation; no commit._

## Files Created/Modified
- `src/internal/controllers/validation.ts` - NEW ReactiveController resolving custom-wins message + touch-gated native message; not re-exported from src/index*.
- `src/components/input/input.ts` - Wires the controller, mirrors native validity onto ElementInternals.setValidity, renders the same-root aria-live message region, adds `setCustomError` facade + `part="error"`.
- `test/components/validation-controller.test.ts` - NEW jsdom unit tests for D-03 precedence, D-01 timing gate, `''` fallback/clear edge, never-throws.
- `test/browser/validation-timing.test.ts` - NEW Chromium proof: first-paint silence, blur surfaces native message, live-clear, assertive submit.
- `test/browser/validation-aria.test.ts` - NEW Chromium proof: same-root aria-describedby, D-04 politeness, setCustomError override/fallback, text-not-markup (T-04-01), `:host([invalid])` hook.
- `test/components/input.test.ts` - Added jsdom validation assertions (no first-paint error, setCustomError reflection, `''` clear).
- `test/browser/form-association.test.ts` - Updated the prior "no setValidity" carried-finding test now that am-input calls setValidity (see Deviations).

## Decisions Made
- **Option A (per checkpoint):** `setCustomError` lives on each control, giving a same-shadow-root message region by construction — the only shape that satisfies Pitfall 3. Confirmed by user before the freeze-binding API was implemented.
- **Custom errors bypass the touch gate:** a programmatic `setCustomError('...')` is an explicit act and shows immediately; only *native* constraint messages are gated on blur/submit (D-01).
- **Ownership-tracked invalid reflection:** validation sets/clears `invalid` only when it owns the state, so a consumer-set `invalid` attribute (used across the library declaratively) is not clobbered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/scope] Updated the browser form-association carried-finding test**
- **Found during:** Task 2 (tracer implementation)
- **Issue:** `test/browser/form-association.test.ts` asserted `form.checkValidity() === true` for a required-empty am-input, documented as a carried finding "no control calls setValidity". This plan makes am-input call `setValidity`, so that assertion (and the file's header note) became false and would fail in the browser lane.
- **Fix:** Updated the assertion to `checkValidity() === false` (finding resolved), added a companion "valid once a value is provided" case, and corrected the file header note to scope the remaining finding to the other controls.
- **Files modified:** test/browser/form-association.test.ts
- **Verification:** Full browser lane green (49 tests, 7 files).
- **Committed in:** `a625aee` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/in-scope test correction)
**Impact on plan:** The change was a direct, necessary consequence of wiring setValidity — the whole point of FEAT-01. No scope creep.

## Issues Encountered
- **willUpdate vs updated() for validity reflection:** an initial attempt to reflect validation in `willUpdate` (to avoid Lit's dev-mode "scheduled an update after update completed" warning) broke initial validity because the `@query` inner `<input>` is not resolved during the first `willUpdate`, so `setValidity` never ran and a real form actually submitted (iframe reload). Reverted to reflecting in `updated()`: native constraint validity is only knowable from the rendered inner input, so the post-render read + one bounded extra update is the correct, standard pattern. The remaining Lit dev-mode warning is benign (dev-only, bounded) and is documented in code.

## Next Phase Readiness
- The `ValidationController` seam is proven on one control and ready for the 13-control expansion (plans 04-02/03/04) to adopt identically.
- `setCustomError(message: string): void` is the confirmed, JSDoc'd public API that plan 04-10 will capture into the CEM baseline + a Changeset (report-only until the Phase 6 freeze).
- Note for expansion: reflecting native validity requires a post-render read (`updated()`), which emits a benign Lit dev-mode warning — expected and acceptable per control.

## Self-Check: PENDING
(Verified below.)

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
