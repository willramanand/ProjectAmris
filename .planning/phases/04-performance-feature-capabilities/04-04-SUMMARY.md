---
phase: 04-performance-feature-capabilities
plan: 04
subsystem: forms
tags: [validation, elementinternals, aria, lit, reactive-controller, composite-controls, overlays, accessibility]

# Dependency graph
requires:
  - phase: 04
    plan: 01
    provides: ValidationController seam (src/internal) + proven am-input D-03/D-01 wiring pattern
provides:
  - setCustomError(message) + native validationMessage surfacing on am-select, am-combobox, am-rich-select, am-date-picker, am-time-picker
  - Same-shadow-root aria-live message region anchored to each control's primary focusable (Pitfall 3)
  - ElementInternals.setValidity mirrored from required/empty state on five overlay/composite controls
affects: [04-10, form-controls, validation-expansion, phase-6-freeze]

# Actuals (#2632)
actuals:
  tokens: 10600
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composite/overlay controls compute valueMissing from required/empty host state (no inner native input) and mirror it onto ElementInternals.setValidity with a host-supplied message"
    - "Shared _renderError() fragment + primary-focusable aria-describedby across a control's multiple render modes (combobox text/select modes)"
    - "Multi-focusable controls (date/time pickers) stamp aria-describedby on every segment button and anchor setValidity to the first segment"

key-files:
  created: []
  modified:
    - src/components/select/select.ts
    - src/components/combobox/combobox.ts
    - src/components/rich-select/rich-select.ts
    - src/components/date-picker/date-picker.ts
    - src/components/time-picker/time-picker.ts
    - test/components/select.test.ts
    - test/components/combobox.test.ts
    - test/components/rich-select.test.ts
    - test/components/date-picker.test.ts
    - test/components/time-picker.test.ts

key-decisions:
  - "Composites have no native constraint-validating inner input as their primary focusable, so the host computes valueMissing (required && empty) and supplies a default 'Please fill out this field.' message via ElementInternals.setValidity — the controller reads it back as the native validationMessage (D-01/FEAT-01)"
  - "Combobox uses one uniform computed-validity path across text-mode (input focusable) and select-mode (role=combobox wrapper focusable) for identical behavior in both modes"
  - "Date/time pickers anchor setValidity + aria-describedby to the first segment; every segment button carries aria-describedby so the message is announced regardless of which segment holds focus"
  - "markTouched fires on the primary focusable's blur (D-01 gate); mirrored input.ts ownership-tracked :host([invalid]) reflection so a consumer-set invalid attribute is never clobbered"

requirements-completed: [FEAT-01, FEAT-02]

# Metrics
duration: ~15min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 04: Composite/Overlay Validation Wiring Summary

**Wired the shared `ValidationController` and a public `setCustomError()` into the five composite/overlay form controls (am-select, am-combobox, am-rich-select, am-date-picker, am-time-picker) — each now surfaces a same-shadow-root `aria-live` validation message anchored to its primary focusable, with D-03 custom-wins precedence and D-01 touch-gated native messaging, without touching the Phase 3 listbox-nav / floating-position seams.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3 (all TDD: RED test commit → GREEN implementation commit)
- **Files modified:** 10 (5 source + 5 test)
- **Commits:** 6

## Accomplishments

- Adopted the non-exported `ValidationController` (from 04-01) identically across all five composite controls — no new public seam introduced.
- Each control mirrors its `required`/empty state onto `ElementInternals.setValidity` and renders a control-owned `aria-live` region referenced by `aria-describedby`, with `:host([invalid])` reflected via `--am-danger`.
- Implemented the public `setCustomError(message: string): void` facade on each control with D-03 custom-wins precedence and `''`-clears-to-native semantics, JSDoc'd for CEM capture in plan 04-10.
- Handled the multi-mode/multi-focusable cases: combobox anchors to the text-mode `<input>` or the select-mode `role=combobox` wrapper; date/time pickers anchor to the first segment and stamp `aria-describedby` on every segment button.
- Confirmed the FIX-02 seam is untouched: `git diff` on `src/internal/controllers/listbox-nav.ts` is empty; all pre-existing option-nav / index-clamp / listener-teardown suites stay green.

## Task Commits

1. **Task 1 (TDD RED): select + combobox validation specs** — `63ef8e7` (test)
2. **Task 1 (TDD GREEN): ValidationController + setCustomError into am-select and am-combobox** — `9e9e49f` (feat)
3. **Task 2 (TDD RED): rich-select + date-picker validation specs** — `e3265ff` (test)
4. **Task 2 (TDD GREEN): wiring into am-rich-select and am-date-picker** — `9cb15a9` (feat)
5. **Task 3 (TDD RED): time-picker validation specs** — `0b374e6` (test)
6. **Task 3 (TDD GREEN): wiring into am-time-picker** — `4ac3771` (feat)

## Files Modified

- `src/components/select/select.ts` — ValidationController + `_syncValidation` (computes valueMissing from `required && value===''`), `setCustomError`, error region anchored to `.trigger`, `.error-text` styling.
- `src/components/combobox/combobox.ts` — Same wiring with a `_anchorEl` getter selecting the text-mode input vs select-mode wrapper; shared `_renderError()` used by both render paths; select-mode wrapper gains `aria-invalid`/`aria-describedby` + blur markTouched.
- `src/components/rich-select/rich-select.ts` — Wiring anchored to the `.trigger` combobox button; floating-position seam (`autoUpdate`) untouched.
- `src/components/date-picker/date-picker.ts` — Wiring computes valueMissing from `_hasValue`; anchor = first `.segment`; all three segment buttons carry `aria-invalid`/`aria-describedby` + blur markTouched.
- `src/components/time-picker/time-picker.ts` — Same segment pattern (hours/minutes/seconds/period); plain composite (no floating-ui).
- Five `test/components/*.test.ts` — Added `validation (jsdom lane)` describe blocks: no first-paint error, D-01 touch gate, D-03 precedence + `''` fallback, same-shadow-root `aria-describedby` resolution, plus the combobox select-mode wrapper path.

## Decisions Made

- **Host-computed validity for composites:** unlike am-input (which reads the browser-localized message off an inner native `<input>`), four of the five controls (and combobox select-mode) have no native constraint-validating inner input as their primary focusable. The host therefore computes `valueMissing` from `required`/empty state and supplies a default `'Please fill out this field.'` message to `setValidity`; `ElementInternals.validationMessage` returns exactly that, and the controller resolves it as the native message. This is faithful to FEAT-01 (the surfaced message *is* the control's native constraint message) and keeps behavior uniform across all five.
- **Uniform combobox path:** both combobox modes use the same computed-validity flow rather than reading the text-mode input's native `validity`, so text-mode and select-mode behave identically.
- **Anchor choice for pickers:** setValidity anchors to the first segment (a stable, always-present focusable); `aria-describedby` is stamped on every segment so the message is announced from whichever segment is focused.

## Deviations from Plan

None — the plan executed as written. The default-message decision above is an implementation detail the plan anticipated ("the overlay controls have no native constraint-validating inner input"), not a scope change. No architectural (Rule 4) changes; no auto-fixed bugs were needed.

## Known Stubs

None. No hardcoded placeholder data, no `TODO`/`FIXME`, no unwired data sources were introduced. All five controls surface real, functional validation.

## Cross-Plan Integration Note (not a defect)

The plan's Task-3 acceptance criterion "all 14 named form-associated controls expose `setCustomError`" is a **phase-level integration gate** that can only pass after the parallel-wave sibling plans merge. In this isolated worktree (based on 04-01 only), the check reports the 8 controls still owned by sibling plans as missing:

`textarea, checkbox, switch, radio, slider, color-picker, number-field, input-otp` (plans 04-02 text family / 04-03 choice+range).

All 6 controls in scope for the 04-01→04-04 lineage — `input` (04-01) plus this plan's five composites — expose `setCustomError`. The full 14/14 assertion is expected to hold once the orchestrator merges the wave. No action required from this plan.

## Verification

- `npx tsc --noEmit` — exits 0 (clean).
- `npx vitest --project jsdom --run select combobox rich-select date-picker time-picker` — 97/97 pass (5 files).
- Full jsdom suite — 502/502 pass (70 files); no regressions.
- `git diff` on `src/internal/controllers/listbox-nav.ts` — empty (FIX-02 seam untouched).
- Browser lane (Chromium ElementInternals) not run here; the setValidity anchor is passed for real-browser correctness. Deferred to the phase-level browser lane.

## Self-Check: PASSED

All 5 source files and 5 test files are git-tracked and modified across the 6 task commits (63ef8e7, 9e9e49f, e3265ff, 9cb15a9, 0b374e6, 4ac3771). `tsc` clean; the five composite suites and the full jsdom suite are green; listbox-nav.ts confirmed unchanged; all five composites + input expose `setCustomError`.

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
