---
phase: 10-graceful-degradation-compatibility-matrix
reviewed: 2026-08-27T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - src/internal/helpers/capabilities.ts
  - src/internal/helpers/attach-internals-safe.ts
  - src/internal/helpers/form-participation.ts
  - src/internal/controllers/validation.ts
  - src/compat-forms.ts
  - src/components/input/input.ts
  - src/components/button/button.ts
  - src/components/checkbox/checkbox.ts
  - src/components/combobox/combobox.ts
  - src/components/color-picker/color-picker.ts
  - src/components/date-picker/date-picker.ts
  - src/components/number-field/number-field.ts
  - src/components/input-otp/input-otp.ts
  - src/components/radio/radio.ts
  - src/components/rich-select/rich-select.ts
  - src/components/select/select.ts
  - src/components/slider/slider.ts
  - src/components/switch/switch.ts
  - src/components/textarea/textarea.ts
  - src/components/time-picker/time-picker.ts
  - src/components/app-shell/app-shell.ts
  - src/components/card/card.ts
  - src/components/dialog/dialog.ts
  - package.json
  - vite.config.ts
  - scripts/smoke-pack.mjs
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-08-27
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

The COMPAT-01..06 degradation work is, on the whole, carefully built: the XOR gate
(`if (!this.internals)`) is applied uniformly across all 16 form components, so the
Light-DOM fallback and native `ElementInternals` are structurally mutually exclusive —
I found **no double-submit / freeze-violation path**. `attachInternalsSafe` is a clean
pass-through above the floor and null-returning below it; the hidden-input mirror is
built with `createElement` + property assignment only (no `innerHTML`/`eval`), is an
idempotent find-or-create keyed by a per-host `WeakMap`, and tears down cleanly. The
`@willramanand/amris/compat-forms` subpath is wired correctly through `package.json`
exports, `sideEffects`, the Vite entry, and the smoke-pack resolution matrix, and it
imports no Lit and registers no element (CEM surface unchanged).

The defects below are not in the happy path. They are (1) an **inconsistency in *when*
the fallback re-syncs** across the 16 components that can drop a value or a constraint
from the mirror below the floor, (2) a **gap between the shipped changeset's promise and
actual behavior** for boolean/group required controls below the floor, and (3) **three of
the four "load-bearing" capability probes having no production consumer at all**.

## Warnings

### WR-01: Fallback re-sync is inconsistently gated — mirror can go stale (or drop a value) below the floor

**Files:**
- `src/components/select/select.ts:620-637`
- `src/components/radio/radio.ts:148-171`
- `src/components/radio/radio.ts:376-399` (am-radio-group)
- `src/components/number-field/number-field.ts:190-207`
- `src/components/input-otp/input-otp.ts:162-179`
- `src/components/rich-select/rich-select.ts:357-373`

**Issue:** `input.ts:299-319` documents the intended contract explicitly: the fallback
branch "runs on EVERY `updated()` pass (not gated to `changed.has('value')`) so the
mirror stays in sync with name/required/pattern/disabled changes too." `input`,
`textarea`, `checkbox`, `switch`, `combobox`, `slider`, `color-picker`, `date-picker`,
and `time-picker` follow this — the `if (!this.internals)` block is top-level in
`updated()`.

The six files above instead nest the fallback **inside** a `changed.has('value')` /
`changed.has('checked')` / `changed.has('_values')` block. Consequence below the floor
with the opt-in enabled:

- A later `required` / `pattern` / `disabled` change that does **not** also change the
  value is never mirrored onto the hidden input, so native constraint validation on the
  mirror diverges from the control's actual constraints (defeats D-03 for the dynamic case).
- Worse: if `name` is assigned *after* the initial value-bearing update (e.g. a framework
  that sets `value` then `name`), the mirror keeps `name=""`. A form control with an empty
  name is not a successful control, so the value silently disappears from `FormData` —
  a below-floor data-loss path.

**Fix:** Hoist the `if (!this.internals) { … syncFormFallback / teardown … }` block out of
the `changed.has(...)` guard in all six files so it runs every `updated()` pass, matching
`input.ts`. For the checked/value-driven teardown-on-empty controls (`radio`,
`radio-group`), keep the checked/value branch for the create-vs-teardown decision but
re-evaluate it every pass:

```ts
protected updated(changed: PropertyValues) {
  if (changed.has('value')) this.internals?.setFormValue(this.value);
  if (!this.internals) {                         // every pass, not gated on value
    if (isFormFallbackEnabled()) {
      syncFormFallback(this, { name: this.name, value: this.value,
                               required: this.required, disabled: this.disabled });
    } else {
      warnBelowFloorOnce('am-select');
    }
  }
  // ...
}
```

### WR-02: `required` is not enforced below the floor for teardown-on-empty controls — contradicts the shipped changeset

**Files:**
- `src/components/checkbox/checkbox.ts:208-223`
- `src/components/radio/radio.ts:155-169`
- `src/components/radio/radio.ts:382-397` (am-radio-group)
- `src/components/switch/switch.ts:204-218`

**Issue:** These controls tear the mirror **down** when unchecked / empty
(`teardownFormFallback(this)`), to match native "absent from FormData" semantics. But
removing the mirror also removes the only native constraint-validation candidate, so an
unchecked-but-`required` checkbox/switch or an empty-but-`required` radio group below the
floor **does not block native form submission**. `.changeset/compat-forms-fallback.md:8-11`
promises the fallback restores "native `required`/`pattern` constraint validation for
Amris form controls," which is not true for this class of control. A native
`<input type=checkbox required>` unchecked *does* block submit; the fallback does not.

This is an inherent single-hidden-input limitation (you cannot both omit from `FormData`
and block submit with one text input), so the tradeoff is defensible — but it is undocumented
in the changeset and contradicts its stated guarantee. Client-side validation is not a
security boundary (the server must still validate), which keeps this a Warning rather than
a Critical.

**Fix:** Either (a) narrow the changeset/BROWSER_SUPPORT wording to exclude boolean/group
`required` enforcement below the floor, or (b) for the `required && empty` case keep an
empty-named-but-`required` mirror present so native submit is blocked, and only strip the
`name` (not the node) so it stays absent from `FormData` while remaining a validation
candidate. Whichever is chosen, make it explicit and test it in the browser lane.

### WR-03: Three of four capability probes have no production consumer

**File:** `src/internal/helpers/capabilities.ts:50-76`

**Issue:** `hasFormAssociation()` is consumed by `attach-internals-safe.ts`. The other
three exports — `hasAriaReflection()`, `hasAdoptedStyleSheets()`, and `supportsHas()` —
are referenced only by `capabilities.ts` itself, their own unit tests, and planning docs;
no component or controller imports them (verified by repo-wide grep). The `:has()`
degradation (COMPAT-06) is actually delivered purely in CSS via
`@supports selector(:has(*))` in `card/panel/dialog/app-shell/drawer/side-nav`, and
adopted-stylesheet / ARIA-reflection fallback is handled by Lit itself. The probes are
therefore dead exports whose passing memoization tests give false confidence that a JS
degradation path is wired when none is. (They are tree-shaken from consumer bundles since
nothing imports them, so there is no shipped-size cost — this is a maintainability /
correct-mental-model defect, not a runtime one.)

**Fix:** Either wire the probes to the code paths they were meant to guard, or delete the
three unused probes (and their `__resetCapabilitiesForTest` branches / isolation tests) and
keep only `hasFormAssociation`. If they are intentionally retained as public-internal
utilities, add a comment stating they have no current consumer so a future reader does not
assume the degradation is JS-driven.

## Info

### IN-01: `hasAdoptedStyleSheets` references `Document` without a `typeof` guard

**File:** `src/internal/helpers/capabilities.ts:62`

**Issue:** The module's own contract (lines 18-23) states a probe "NEVER throws … even when
the backing global … is absent." `supportsHas` and the two `ElementInternals` probes use
`typeof X !== 'undefined'` guards, but `hasAdoptedStyleSheets` dereferences
`Document.prototype` directly, and `hasFormAssociation` dereferences
`HTMLElement.prototype` directly. In a non-DOM context (Node/SSR without a DOM shim) these
throw `ReferenceError` rather than returning a boolean. Low risk because these probes only
execute inside a live custom element (where the base DOM globals are always present), but it
is inconsistent with the stated "never throw when a global is absent" invariant.

**Fix:** Guard the base globals for symmetry, e.g.
`return (_adoptedStyleSheets ??= typeof Document !== 'undefined' && 'adoptedStyleSheets' in Document.prototype);`
— or amend the module doc to scope the "never throw" guarantee to a DOM environment.

### IN-02: Module-level mutable global state in `form-participation.ts`

**File:** `src/internal/helpers/form-participation.ts:68-74`

**Issue:** `_fallbackEnabled`, `_warned`, and the `_mirrors` WeakMap are module-level mutable
singletons. CLAUDE.md's architecture section states "No Global State … No module-level
singletons." This is a reasonable exception for a process-wide opt-in flag (it mirrors the
established `lazy-load.ts` memo pattern), but it is worth noting against the stated principle,
and it means the flag is only shared if the bundler emits `form-participation` as a single
shared chunk (Rollup/Vite dedupe it, so this holds — but a future split could silently break
activation).

**Fix:** No change required; optionally document the exception at the module head alongside the
existing `lazy-load.ts` cross-reference, and keep the single-chunk assumption covered by the
smoke-pack.

### IN-03: `am-button` below-floor warning points at a fallback it will never use

**File:** `src/components/button/button.ts:270-272`

**Issue:** `am-button` has no value to mirror, so below the floor it calls the shared
`warnBelowFloorOnce('am-button')`, whose message tells the developer to import
`@willramanand/amris/compat-forms` to enable the hidden-input fallback. Importing that subpath
does nothing for a button (there is no button fallback branch), so the guidance is misleading
in the button-only case.

**Fix:** Give the button a distinct message (or omit the compat-forms suggestion for it), e.g.
"below the ElementInternals floor `<am-button type=submit|reset>` cannot drive its associated
form; there is no fallback for buttons."

---

_Reviewed: 2026-08-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
