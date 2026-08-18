---
phase: 04-performance-feature-capabilities
plan: 03
subsystem: forms
tags: [validation, elementinternals, aria, lit, reactive-controller, web-components, accessibility, choice-controls]

# Dependency graph
requires:
  - phase: 04
    plan: 01
    provides: ValidationController seam (src/internal) + proven same-shadow-root aria-live message pattern (am-input)
provides:
  - setCustomError(message) public method on am-checkbox, am-switch, am-radio-group, am-slider, am-color-picker
  - Same-shadow-root validation message region + aria-describedby/aria-invalid wiring on all five choice/range controls
  - required constraint + reflected invalid attribute on am-switch and am-color-picker (new); reflected invalid on am-checkbox/am-radio-group/am-slider (new)
  - radio validation anchored on the form-associated GROUP (holds value + internals), never an individual radio
affects: [04-04, 04-10, form-controls, validation-expansion, phase-6-freeze]

# Actuals (#2632)
actuals:
  tokens: 15000
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual required->valueMissing ElementInternals.setValidity for non-native-input controls (checkbox/switch/radio-group/color-picker) — author supplies the message string"
    - "Native range constraint mirrored onto host internals for am-slider (am-input analog)"
    - "Radio-group validation anchored on the GROUP host (role=radiogroup + value + internals); markTouched gated on focusout leaving the group"

key-files:
  created: []
  modified:
    - src/components/checkbox/checkbox.ts
    - test/components/checkbox.test.ts
    - src/components/switch/switch.ts
    - test/components/switch.test.ts
    - src/components/radio/radio.ts
    - test/components/radio.test.ts
    - src/components/slider/slider.ts
    - test/components/slider.test.ts
    - src/components/color-picker/color-picker.ts
    - test/components/color-picker.test.ts
    - test/browser/form-association.test.ts

key-decisions:
  - "Non-native-input controls (checkbox/switch/radio-group/color-picker) compute their own valueMissing flag + author-supplied message and call setValidity — there is no inner native input to read validationMessage from"
  - "am-radio-group anchors aria-invalid/aria-describedby on the GROUP host (role=radiogroup, holds value + internals); the group setValidity omits the anchor arg because the host is not a shadow descendant"
  - "am-slider mirrors the inner native range input's constraint validity exactly like am-input; a range is effectively always valid, so setCustomError is its primary path"
  - "Added a `required` property to am-switch and am-color-picker (Rule 2) so FEAT-01 native-message surfacing is reachable for those controls"

patterns-established:
  - "Per-control _syncValidation() in updated(): compute/mirror validity -> setValidity -> reflect controller.message/invalid into @state + reflected invalid attribute (ownership-tracked, mirrors am-input)"
  - "markTouched wired on the control's focusable blur (checkbox .control, switch .track, slider range input, color-picker .trigger) or on focusout-leaving-group (radio-group)"

requirements-completed: [FEAT-01, FEAT-02]

coverage:
  - id: D1
    description: "am-checkbox + am-switch surface native validationMessage + setCustomError with D-03 precedence and D-01 timing (jsdom lane); no first-paint error; :host([invalid]) reflected"
    requirement: FEAT-01
    verification:
      - kind: unit
        ref: "test/components/checkbox.test.ts#validation (jsdom lane)"
        status: pass
      - kind: unit
        ref: "test/components/switch.test.ts#validation (jsdom lane)"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-radio-group message + aria-describedby/aria-invalid attach to the form-associated GROUP (not a child radio); required-empty shows no first-paint error and surfaces after group blur"
    requirement: FEAT-01
    verification:
      - kind: unit
        ref: "test/components/radio.test.ts#am-radio-group > validation (jsdom lane)"
        status: pass
    human_judgment: false
  - id: D3
    description: "am-slider + am-color-picker surface validation with setCustomError D-03 precedence and D-01 timing; no first-paint / no spurious blur error"
    requirement: FEAT-02
    verification:
      - kind: unit
        ref: "test/components/slider.test.ts#validation (jsdom lane)"
        status: pass
      - kind: unit
        ref: "test/components/color-picker.test.ts#validation (jsdom lane)"
        status: pass
    human_judgment: false
  - id: D4
    description: "ValidationController remains off the public surface (not re-exported from src/index.ts / src/index.all.ts)"
    requirement: FEAT-02
    verification:
      - kind: other
        ref: "grep ValidationController src/index.ts src/index.all.ts -> not found"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 03: Choice/Range Control Validation Expansion Summary

**am-checkbox, am-switch, am-radio-group, am-slider, and am-color-picker each adopt the shared tracer `ValidationController` — surfacing native validation messages and a new `setCustomError()` in a same-shadow-root `aria-live` region with D-03 custom-wins precedence and D-01/D-04 timing/politeness; the radio message anchors to the form-associated group.**

## Performance
- **Duration:** ~20 min
- **Tasks:** 3 (each TDD: RED spec commit -> GREEN implementation commit)
- **Files modified:** 11 (5 component sources, 5 component tests, 1 browser test note)

## Accomplishments
- Extended the proven `ValidationController` seam from am-input to the five remaining boolean/range controls without touching the controller itself — the src/internal reuse target held for non-text focusables exactly as designed.
- Wired same-shadow-root `aria-live` error regions with `aria-describedby`/`aria-invalid` on each control's real focusable: checkbox `.control`, switch `.track`, slider range `<input>`, color-picker `.trigger`, and — critically — the radio-group **host** (which holds role=radiogroup + value + internals), never an individual radio (T-04-07 mitigation).
- Implemented the public `setCustomError(message)` facade on all five (JSDoc'd for CEM capture by plan 04-10) with custom-wins-over-native precedence and `''`-clears-to-native semantics.
- For the four controls with no inner native input (checkbox/switch/radio-group/color-picker), computed the `valueMissing` flag from the host's own required/value state and supplied the message string to `ElementInternals.setValidity` — the correct pattern for form-associated custom elements. am-slider mirrors its native range input's validity like am-input.
- Messages render via Lit `${}` text binding only — no raw-HTML sink (T-04-06 mitigation), asserted by the jsdom specs.

## Task Commits
1. **Task 1 RED** — failing checkbox/switch validation specs — `dfbeb41` (test)
2. **Task 1 GREEN** — ValidationController + setCustomError in am-checkbox/am-switch — `1f300ea` (feat)
3. **Task 2 RED** — failing radio-group/slider validation specs — `4b2747d` (test)
4. **Task 2 GREEN** — ValidationController + setCustomError in am-radio-group/am-slider — `d28d948` (feat)
5. **Task 3 RED** — failing color-picker validation specs — `77bb73d` (test)
6. **Task 3 GREEN** — ValidationController + setCustomError in am-color-picker (+ browser note) — `a4b0a04` (feat)

## Decisions Made
- **Author-supplied constraint messages:** unlike am-input (which reads its inner `<input>.validationMessage`), the boolean/composite controls have no native input, so the host computes `valueMissing` and passes a native-style message string to `setValidity`. This is the standard form-associated-custom-element pattern; ElementInternals never auto-generates messages.
- **Radio-group anchoring on the host:** the group's `role=radiogroup`, value, and internals all live on the host, so `aria-invalid`/`aria-describedby` and the message region attach there. The group's `setValidity` omits the anchor argument because a real `ElementInternals` rejects a non-shadow-descendant anchor; validity + message are sufficient.
- **markTouched timing:** blur on the visible focusable for checkbox/switch/slider/color-picker; `focusout` leaving the whole group for radio-group (roving between radios is exempt via a `relatedTarget` containment check).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added a `required` property to am-switch and am-color-picker**
- **Found during:** Tasks 1 and 3
- **Issue:** The FEAT-01 truth requires each of the five controls to surface a *native* validation message on D-01 timing. am-switch and am-color-picker had no `required` constraint, so no native violation could ever occur — the native-message path was unreachable.
- **Fix:** Added `@property({ type: Boolean, reflect: true }) required = false;` to both, driving `valueMissing` in `_syncValidation`. am-checkbox and am-radio-group already had `required`.
- **Files modified:** src/components/switch/switch.ts, src/components/color-picker/color-picker.ts
- **Note:** New public surface — captured by plan 04-10 into the CEM baseline alongside `setCustomError` (report-only until the Phase 6 freeze).
- **Committed in:** `1f300ea` (switch), `a4b0a04` (color-picker)

**2. [Rule 1 - In-scope test note correction] Refreshed the browser form-association carried-finding note**
- **Found during:** Task 3
- **Issue:** `test/browser/form-association.test.ts`'s header note said "The other controls still lack setValidity and remain carried findings" — now false for the five controls this plan wired.
- **Fix:** Updated the note to record that plan 04-03 extended setValidity to these five; the file's `setFormValue` assertions all use valid (non-required / value-present) cases and stay green (no assertion change needed).
- **Files modified:** test/browser/form-association.test.ts
- **Committed in:** `a4b0a04`

**3. [Rule 2 - Reflected invalid attribute] Added reflected `invalid` to am-checkbox, am-switch, am-radio-group, am-slider**
- **Reason:** The plan requires `:host([invalid])` reflection (Safari 16.4 floor, never `:state()`). These four lacked an `invalid` property; added `@property({ type: Boolean, reflect: true }) invalid = false;` with ownership-tracked reflection so validation never clobbers a consumer-set `invalid`. am-color-picker already had it.
- **Committed in:** `1f300ea`, `d28d948`

---
**Total deviations:** 3 auto-fixed (2 Rule 2 missing-functionality, 1 Rule 1 in-scope note). No architectural changes; no scope creep beyond what FEAT-01/FEAT-02 require for these controls.

## Verification
- `npx tsc --noEmit` — exits 0.
- `npx vitest --project jsdom --run checkbox switch radio slider color-picker` — 62/62 pass.
- Full jsdom suite — 501/501 pass (no regressions).
- `ValidationController` absent from `src/index.ts` / `src/index.all.ts` (grep, not found).
- Browser lane not run in-agent (plan verification is jsdom-only); the browser `setFormValue` assertions for these controls use valid cases and are unaffected by the added `setValidity`.

## Known Stubs
None — all five controls are fully wired (real `setValidity`, real `aria` wiring, text-bound messages). No placeholders or TODOs introduced.

## Threat Flags
None beyond the plan's registered threats. T-04-06 (raw-HTML sink) mitigated via text binding; T-04-07 (radio anchored to wrong element) mitigated by anchoring on the form-associated group, asserted by radio.test.ts.

## Next Phase Readiness
- Five more controls now expose the confirmed `setCustomError(message: string): void` public API for plan 04-10's CEM baseline + Changeset (report-only until Phase 6 freeze). New `required` (switch, color-picker) and `invalid` (checkbox, switch, radio-group, slider) properties are additional public surface for 04-10 to capture.
- The manual `valueMissing` + author-message pattern is the template for any remaining non-native-input form control expansion.

## Self-Check: PASSED
All 6 task commits (dfbeb41, 1f300ea, 4b2747d, d28d948, 77bb73d, a4b0a04) exist. All 10 modified source/test files are git-tracked. tsc clean; targeted suite 62/62; full jsdom 501/501; ValidationController not re-exported.

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
