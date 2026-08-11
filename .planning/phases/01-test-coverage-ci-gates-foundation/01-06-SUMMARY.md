---
phase: 01-test-coverage-ci-gates-foundation
plan: 06
subsystem: testing
tags: [vitest, browser-mode, element-internals, form-association, formdata, chromium]

# Dependency graph
requires:
  - "01-01: browser Vitest project (no setupFiles), fixture helper, form-association seed"
provides:
  - "Comprehensive real-ElementInternals FormData participation suite for all form-associated controls (TEST-02)"
  - "Documented findings: search-field and file-upload are NOT form-associated; no control implements setValidity"
affects: [01-07, 01-08]

actuals:
  tokens: 3513
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Grow a single browser test file across tasks; each control mounts inside a real <form> and asserts new FormData(form).get(name) via native setFormValue"
    - "Characterize real current behavior (test-only phase): non-participating controls assert toBeNull() as documented findings rather than fixing source"
    - "Drive input-otp by typing digits into shadow cells; drive file-upload with a native browser DataTransfer"

key-files:
  created: []
  modified:
    - test/browser/form-association.test.ts

key-decisions:
  - "Assert real current behavior, not aspirational behavior: search-field/file-upload non-participation captured as findings (toBeNull), never fixed here (T-01-06b: no source edits)"
  - "Validity participation documented as the existing gap — no control calls setValidity, so required+empty leaves form.checkValidity()===true (carried Phase 4 finding)"
  - "setFormValue uses this.value regardless of options, so select/combobox/rich-select are driven by the value attribute alone (no option-array wiring needed for form participation)"

patterns-established:
  - "Real-<form> FormData assertion per form-associated control against native ElementInternals in Chromium"

requirements-completed: [TEST-02]

coverage:
  - id: D1
    description: "Simple controls (input, textarea, radio-group, switch, number-field, slider) participate in a real <form> via native setFormValue; value appears in FormData (TEST-02)"
    requirement: "TEST-02"
    verification:
      - kind: e2e
        ref: "test/browser/form-association.test.ts — 14 tests pass (Chromium)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Complex controls (select, combobox, rich-select, input-otp, date-picker, time-picker, color-picker) participate in a real <form> via native setFormValue (TEST-02)"
    requirement: "TEST-02"
    verification:
      - kind: e2e
        ref: "npx vitest run --project browser test/browser/form-association.test.ts — 23 tests pass (Chromium)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No assertion in the browser form suite uses getMockInternals or any test/setup.ts mock (browser project omits setupFiles)"
    requirement: "TEST-02"
    verification:
      - kind: automated
        ref: "grep — no getMockInternals import; native-API guard asserts attachInternals/showModal are [native code]"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 06: Real-Form Participation for All Form-Associated Controls Summary

**Expanded the browser `form-association` suite from the checkbox tracer seed to every form-associated control (16 controls, 23 tests), each mounted in a real `<form>` and asserted against `new FormData(form)` through native `ElementInternals.setFormValue` in Chromium — no jsdom mock — surfacing two non-participating controls and the library-wide `setValidity` gap as findings without editing any component source.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-08-11T22:33:46Z
- **Completed:** 2026-08-11T22:36:26Z
- **Tasks:** 2
- **Files modified:** 1 (test/browser/form-association.test.ts)

## Accomplishments
- Grew `test/browser/form-association.test.ts` to cover the full form-associated set: checkbox (seed), input, textarea, radio-group, switch, number-field, slider, select, combobox, rich-select, input-otp, date-picker, time-picker, color-picker — each asserting its value reaches `FormData` via the **native** `setFormValue` path.
- Proved value round-trips both from initial attributes and from post-mount property/interaction changes (input typed value, radio-group re-selection, select re-selection, switch toggle-off withdrawing the value).
- Drove `input-otp` by typing digits into its shadow cells and `file-upload` via a real browser `DataTransfer` — exercising genuine browser APIs the jsdom mock cannot provide.
- Kept the suite strictly mock-free: no `getMockInternals`, no `test/setup.ts` import; the Pitfall-2 native-API guard remains.

## Task Commits

1. **Task 1 — real-form submission for simple controls** — `32fe1dc` (test)
2. **Task 2 — real-form submission for complex controls** — `510e827` (test)

## Files Created/Modified
- `test/browser/form-association.test.ts` — expanded from 3 tests (checkbox seed) to 23 tests spanning all 16 form-associated controls with real `FormData` assertions.

## Decisions Made
- **Characterization, not aspiration.** This is a test-only phase (threat T-01-06b: do not edit component source to make a test pass). Where a control does not participate, the test asserts the *real current behavior* (`toBeNull()`) and is clearly labelled `FINDING`, keeping the suite green while recording the bug for the owning phase.
- **Form value is independent of option arrays.** `select`/`combobox`/`rich-select` call `setFormValue(this.value)` regardless of their rendered options, so form participation is driven by the `value` attribute alone — no `.options` wiring needed in the fixtures.
- **Validity gap documented, not closed.** No control implements `ElementInternals.setValidity` (grep of `src/` confirms zero call sites), so `required` + empty leaves `form.checkValidity() === true`. The validity assertions document this reality and defer the fix to the validation-UX phase (Phase 4), consistent with the tracer's carried finding.

## Deviations from Plan

None — plan executed as written. All expected controls were covered; the two non-participating controls the plan explicitly anticipated ("if any control fails to participate, capture it as a finding") were handled per instruction. No component source was modified.

## Issues Encountered

Findings captured for the owning phase (real bugs; not fixed here per the phase-wide prohibition):

1. **`am-search-field` is not form-associated.** It has no `static formAssociated`, never attaches `ElementInternals`, and renders a shadow-DOM `<input name>` that cannot join the outer light-DOM form. Its value never reaches `FormData` (`FormData.get('q') === null`). Test asserts this reality.
2. **`am-file-upload` is not form-associated and exposes no `name` property.** Even with a real `File` attached via native `DataTransfer`, it contributes nothing to `FormData` (`FormData.get('doc') === null`). Test asserts this reality.
3. **No form-associated control implements `ElementInternals.setValidity`** (library-wide). A `required` + empty control does not invalidate its host `<form>` — `form.checkValidity()` stays `true`. This is the tracer's carried Phase 4 finding, now re-confirmed against the whole control set.

## Known Stubs
None — every test exercises a real component against real browser `FormData`/`ElementInternals`. The `toBeNull()` assertions for search-field/file-upload are intentional characterizations of real (non-)behavior, not placeholder stubs.

## Threat Flags
None — no new runtime surface. The suite is test-only and runs in the PR-triggered, read-only browser CI job from plan 01 (honors threat register T-01-06a/T-01-06b).

## User Setup Required
None. The browser lane needs `npx playwright install chromium` locally (opt-in) and is installed automatically in CI; `npm test` (jsdom) is unaffected.

## Next Phase Readiness
- TEST-02 is now proven for the whole form-associated control set against the native browser API, not the jsdom mock.
- **Carried findings for the owning/validation phase:** (a) make `am-search-field` and `am-file-upload` form-associated (or document them as intentionally non-form controls), and (b) implement `ElementInternals.setValidity` so `required` participation can be asserted positively.

## Self-Check: PASSED
- `test/browser/form-association.test.ts` present and expanded (23 tests, 5-file browser project all green).
- Both task commits (`32fe1dc`, `510e827`) exist in git history.

---
*Phase: 01-test-coverage-ci-gates-foundation*
*Completed: 2026-08-11*
