---
phase: 04-performance-feature-capabilities
plan: 02
subsystem: forms
tags: [validation, elementinternals, aria, lit, reactive-controller, web-components, accessibility, mutation-observer]

# Dependency graph
requires:
  - phase: 04-01
    provides: ValidationController seam (src/internal), same-shadow-root aria-live message region pattern proven on am-input
provides:
  - am-field D-02 hint<->error visual swap (light-DOM presentational orchestration; no new public event)
  - am-textarea / am-number-field / am-input-otp validation UX (native/synthetic validationMessage surfaced, setCustomError public API, same-shadow-root aria-live message regions)
  - am-input-otp `required` property (new, needed to give the aggregate multi-cell value a constraint concept)
  - Browser-lane finding resolution: textarea/number-field/input-otp now call ElementInternals.setValidity
affects: [04-03, 04-04, form-controls, validation-expansion, phase-6-freeze]

# Actuals (#2632)
actuals:
  tokens: 11800
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "am-field: per-instance MutationObserver (attributeFilter ['invalid']) on the default-slotted control, resolved via @queryAssignedElements() on slotchange, torn down in disconnectedCallback"
    - "Hint/error visual swap toggles `hidden` directly on the named <slot> elements (no wrapper divs, slot stays in the tree)"
    - "am-input-otp: synthetic constraint validity (required + aggregate value length < cell count) mirrored onto ElementInternals.setValidity, since a multi-cell control has no native constraint of its own"
    - "am-input-otp: group-level D-01 timing via `focusout` + relatedTarget containment check (touched only when focus leaves ALL cells, not on inter-cell moves)"

key-files:
  created: []
  modified:
    - src/components/field/field.ts
    - test/components/field.test.ts
    - src/components/textarea/textarea.ts
    - test/components/textarea.test.ts
    - src/components/number-field/number-field.ts
    - test/components/number-field.test.ts
    - src/components/input-otp/input-otp.ts
    - test/components/input-otp.test.ts
    - test/browser/form-association.test.ts

key-decisions:
  - "am-field D-02 swap hides the whole `<slot name=\"hint\">`/`<slot name=\"error\">` element via `hidden` rather than mutating the slotted node — keeps consumer content untouched and the slot in the tree per the plan's 'without removing the slot from the tree' constraint"
  - "am-input-otp anchor split: aria-describedby/aria-invalid attach to the role=group container (the stable, focus-independent AT-facing anchor); the ValidationController's internal `anchor` accessor (used for ElementInternals.setValidity's native focus target) is the first cell, the OTP's actual primary focusable"
  - "am-input-otp required is new public surface — there is no native multi-cell constraint, so `required` + aggregate-value completeness is the only way to give the control a meaningful invalid state; captured for CEM/Changeset alongside setCustomError per D-03's freeze-binding note"

requirements-completed: [FEAT-01]

coverage:
  - id: D1
    description: "am-field hides the slotted hint and shows the slotted error while the default-slotted control reflects `invalid`, and reverses when it clears (D-02); per-instance MutationObserver, no module-level state, disconnected on disconnect"
    requirement: FEAT-01
    verification:
      - kind: unit
        ref: "test/components/field.test.ts#D-02 hint <-> error swap"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-textarea and am-number-field surface native validationMessage + setCustomError with D-03 precedence and D-01/D-04 timing in the jsdom lane; no first-paint error; :host([invalid]) reflected"
    requirement: FEAT-01
    verification:
      - kind: unit
        ref: "test/components/textarea.test.ts#validation (jsdom lane); test/components/number-field.test.ts#validation (jsdom lane)"
        status: pass
    human_judgment: false
  - id: D3
    description: "am-input-otp surfaces a synthetic validationMessage (required + aggregate completeness) + setCustomError with D-03 precedence; group-level D-01 timing (touched only when focus leaves all cells)"
    requirement: FEAT-01
    verification:
      - kind: unit
        ref: "test/components/input-otp.test.ts#validation (jsdom lane)"
        status: pass
    human_judgment: false
  - id: D4
    description: "textarea/number-field/input-otp now call ElementInternals.setValidity, proven against real Chromium ElementInternals: required+empty/incomplete blocks form submission, becomes valid once filled"
    requirement: FEAT-01
    verification:
      - kind: e2e
        ref: "test/browser/form-association.test.ts#am-textarea, #am-number-field, #am-input-otp (finding resolved)"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 02: Text-Entry Validation Expansion + am-field D-02 Swap Summary

**Expanded the proven ValidationController tracer to am-textarea, am-number-field, and am-input-otp, and implemented am-field's D-02 hint-to-error visual swap driven by a per-instance MutationObserver on the control's reflected `invalid` attribute.**

## Performance

- **Duration:** ~9 min
- **Commits:** 6 (3 task pairs: 1 single commit for am-field, RED+GREEN pairs for the two TDD tasks)
- **Files modified:** 9 (0 created, 9 modified)

## Accomplishments
- **am-field (D-02):** the slotted `am-hint-text` hides and `am-error-text` shows while the default-slotted control reflects `invalid`, and reverses on clear — presentational only, driven by a per-instance `MutationObserver` resolved via `@queryAssignedElements()` on slotchange and disconnected in `disconnectedCallback`. No module-level state.
- **am-textarea / am-number-field:** adopted the `ValidationController` identically to am-input — same-shadow-root `aria-live` message region, `aria-describedby`/`aria-invalid` on the inner focusable, `ElementInternals.setValidity` mirrored from native constraint validity, and the public `setCustomError(message: string): void` facade.
- **am-input-otp:** adopted the `ValidationController` for its aggregate multi-cell value. Added a new `required` property (there is no native constraint for a synthetic multi-cell control) so completeness of the joined value drives a synthetic `valueMissing` message. Group-level D-01 timing: `markTouched()` fires only when a `focusout`'s `relatedTarget` leaves the cell set entirely, not on normal inter-cell navigation.
- **Browser-lane finding resolution:** updated `test/browser/form-association.test.ts` (carried finding from the test-only phase) to prove `checkValidity()` now correctly blocks/allows submission for all three newly-wired controls against real Chromium `ElementInternals`.

## Task Commits

1. **Task 1: am-field D-02 hint↔error visual swap** - `654d67b` (feat)
2. **Task 2 (TDD RED): failing textarea/number-field validation tests** - `032f092` (test)
3. **Task 2 (TDD GREEN): ValidationController wiring in textarea + number-field** - `af22e12` (feat)
4. **Task 3 (TDD RED): failing input-otp validation tests** - `a616e5a` (test)
5. **Task 3 (TDD GREEN): ValidationController wiring in input-otp** - `a0c272e` (feat)
6. **Deviation (Rule 1): resolve carried browser-lane setValidity findings** - `4b49fdf` (test)

## Files Created/Modified
- `src/components/field/field.ts` - D-02 hint/error swap: `@queryAssignedElements()` + per-instance `MutationObserver`, `?hidden` toggled on the named `<slot>` elements.
- `test/components/field.test.ts` - jsdom coverage: valid state, invalid→swap→clear, observer torn down on disconnect.
- `src/components/textarea/textarea.ts` - Wires `ValidationController`, mirrors native validity onto `ElementInternals.setValidity`, renders the same-root `aria-live` message region, adds `setCustomError` facade + `part="error"`.
- `test/components/textarea.test.ts` - jsdom validation assertions (D-01 timing, D-03 precedence).
- `src/components/number-field/number-field.ts` - Same wiring as textarea; adds a `@blur` handler (none existed before) and `markTouched()` on Enter-triggered submit.
- `test/components/number-field.test.ts` - jsdom validation assertions.
- `src/components/input-otp/input-otp.ts` - New `required` property; synthetic constraint validity from aggregate value; group-level `focusout` D-01 gate; `aria-describedby`/`aria-invalid` on the `role="group"` container; `setCustomError` facade.
- `test/components/input-otp.test.ts` - jsdom validation assertions including the inter-cell-vs-group-exit D-01 distinction.
- `test/browser/form-association.test.ts` - Added "finding resolved" `checkValidity()` proofs for the three newly-wired controls; updated the stale header note.

## Decisions Made
- **Slot-level hide, not node mutation:** am-field's D-02 swap sets `hidden` on the `<slot>` wrapper elements themselves (never on the consumer's slotted `am-hint-text`/`am-error-text` nodes), keeping consumer content untouched and the slot always present in the tree.
- **am-input-otp anchor split:** the AT-facing `aria-describedby`/`aria-invalid` pair lives on the `role="group"` container (stable regardless of which cell has focus); the `ValidationController`'s internal `anchor` accessor (used only for `ElementInternals.setValidity`'s native focus-target parameter) is the first cell — the control's actual primary focusable.
- **New `required` property on am-input-otp:** unavoidable — a synthetic multi-cell control has no native constraint validation to surface, so `required` + aggregate completeness is the only way to give it a meaningful invalid state at all. This is new public surface (alongside `setCustomError`) to be captured in the CEM baseline/Changeset per D-03's freeze-binding note.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/scope] Resolved carried browser-lane setValidity findings for textarea/number-field/input-otp**
- **Found during:** Task 2/3 implementation (mirrors the identical 04-01 deviation for am-input)
- **Issue:** `test/browser/form-association.test.ts`'s header comment documented "the other controls still lack setValidity and remain carried findings until their expansion plans land." This plan makes textarea/number-field/input-otp call `setValidity`, making that note stale for these three (though no existing assertion asserted the opposite, so nothing was failing).
- **Fix:** Added "finding resolved" `checkValidity()` proofs (required+empty/incomplete blocks submission; valid once filled) for all three controls, mirroring the am-input pattern from 04-01, and updated the header note to scope the remaining carried finding to controls not yet touched (04-03/04-04).
- **Files modified:** test/browser/form-association.test.ts
- **Verification:** Full browser lane green (55 tests, 7 files).
- **Committed in:** `4b49fdf`

---

**Total deviations:** 1 auto-fixed (1 bug/scope documentation + coverage correction)
**Impact on plan:** Direct, necessary consequence of wiring setValidity into three more controls — no scope creep, mirrors the established 04-01 precedent exactly.

## Next Phase Readiness
- Three of four remaining text-entry-shaped controls in the 15-control expansion set are done (input, textarea, number-field, input-otp). Remaining: checkbox, radio, switch, select, combobox, rich-select, slider, color-picker, date-picker, time-picker — targets for plans 04-03/04-04.
- am-field's D-02 swap is control-agnostic (keys off the reflected `invalid` attribute any form-associated control exposes), so it works unmodified once the remaining controls adopt the same `ValidationController` pattern.
- `am-input-otp`'s new `required` property and all three `setCustomError` surfaces are ready for plan 04-10's CEM baseline capture + Changeset alongside the 04-01 surface.

## Self-Check: PASSED
All 9 modified files are git-tracked and all 6 commits (654d67b, 032f092, af22e12, a616e5a, a0c272e, 4b49fdf) exist in git log. Verification: `npx tsc --noEmit` clean; jsdom full suite 492/492 (70 files); browser full suite 55/55 (7 files); `field`/`textarea`/`number-field`/`input-otp` filtered run 49/49; ValidationController absent from src/index*.ts and not re-exported from any of the four control files.

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
