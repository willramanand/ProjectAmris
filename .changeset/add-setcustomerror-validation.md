---
"@willramanand/amris": minor
---

Add `setCustomError(message)` validation API to the form-associated controls

**New public API:** All 14 form-associated controls now expose a
`setCustomError(message: string): void` method that surfaces an
application-supplied validation message. Passing a non-empty string marks the
control invalid and renders the message through the shared validation controller;
passing an empty string clears the custom error. The active message is also
auto-surfaced via the native `validationMessage` so it participates in native
form validation and constraint reporting.

| Surface | Detail |
| ------- | ------ |
| `setCustomError(message)` | Added to `am-input`, `am-textarea`, `am-number-field`, `am-input-otp`, `am-checkbox`, `am-switch`, `am-radio-group`, `am-slider`, `am-color-picker`, `am-select`, `am-combobox`, `am-rich-select`, `am-date-picker`, `am-time-picker` |
| `error` CSS part | New part exposing the rendered validation message container on the affected controls |
| `invalid` (reflected) | Now reflected to an attribute on controls that gained validity reflection (`am-checkbox`, `am-radio-group`, `am-slider`, `am-switch`, and peers) |
| `required` | Added to `am-switch` and `am-color-picker` for parity with the other form controls |

**Precedence (D-03):** a custom error set via `setCustomError` takes precedence
over the control's built-in constraint messages; clearing it restores native
constraint reporting.

**Timing & politeness (D-01/D-04):** validation messages are announced on the
existing validation-reporting cadence with the established ARIA live politeness,
so screen-reader users hear the message without redundant interruptions.

**am-field (D-02):** the field wrapper swaps to the control's active
`validationMessage`/custom error when present, replacing its own helper text.

No breaking changes — this is purely additive public surface.
