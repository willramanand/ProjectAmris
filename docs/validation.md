# Validation messages

Amris form controls integrate with native HTML constraint validation through the
`ElementInternals` API and surface their messages accessibly — no validation
library required. This page documents the shipped, public behavior: how error
messages appear, when they appear, and how to supply your own.

## How it works

Each form-associated control mirrors its inner input's native constraint validity
onto its own `ElementInternals`, and renders the resulting
`ElementInternals.validationMessage` into a control-owned message region. That
region lives in the **same shadow root** as the control and is wired up
accessibly:

- The message region is announced via `aria-live` and referenced by
  **`aria-describedby`** on the control (same-shadow-root by construction, so the
  reference always resolves).
- While invalid, the control sets **`aria-invalid`** and reflects the
  `:host([invalid])` boolean attribute, so you can style invalid states from
  outside via the frozen `invalid` attribute.
- The message text is rendered as **text only** (never as markup), so a
  server- or consumer-supplied string can't inject HTML.

Announcement politeness follows the interaction: per-field messages are announced
politely as they change, while a failed form submit is announced assertively so a
screen-reader user hears why the submit didn't go through.

## When messages appear (the timing model)

Errors are **not** shown on first paint. Native constraint messages are
**touch-gated**: an error only appears once the user has interacted with the field
— on **blur** away from an invalid field, or on a **failed submit** — matching the
`:user-invalid` interaction model. After that first surface, the message tracks
**live**: as the user edits the field and it becomes valid, the error clears
immediately without waiting for another blur.

This means a pristine form renders no error text, and users aren't scolded for
fields they haven't reached yet.

## Error text replaces the hint

Within an `<am-field>`, the error message and the hint share one slot position.
`<am-field>` composes a control with `label`, `hint`, and `error` slots:

```html
<am-field>
  <am-label slot="label" required>Email</am-label>
  <am-input type="email" required placeholder="you@example.com"></am-input>
  <am-hint-text slot="hint">We'll never share your email.</am-hint-text>
  <am-error-text slot="error">A valid email is required.</am-error-text>
</am-field>
```

While the control is invalid, `<am-field>` **hides the `hint` slot and shows the
`error` slot** in its place; when the control becomes valid again, the hint
returns. This swap is presentational — the control itself owns the
screen-reader-authoritative message and the `aria-describedby` wiring described
above, so the announced message stays correct regardless of the visual swap.

## Supplying your own errors: `setCustomError()`

For consumer- or server-supplied validation (e.g. "This email is already taken"
returned from your API), every form-associated control exposes a public method:

```ts
control.setCustomError(message: string): void;
```

- **`setCustomError('Email already registered')`** displays your message. A
  non-empty custom message **wins over** the native constraint message
  (custom-wins precedence).
- **`setCustomError('')`** clears the custom error and **falls back to the native
  constraint message** (or to no error, if the field is natively valid).

Custom errors are an explicit, programmatic act, so unlike native constraint
messages they are **not** touch-gated — they show immediately when you call
`setCustomError(...)`. This is what you want for server round-trip validation:
the error appears as soon as your handler resolves.

```js
const input = document.querySelector('am-input[name="email"]');
const res = await fetch('/api/check-email?value=' + input.value);
if ((await res.json()).taken) {
  input.setCustomError('That email is already registered.');
} else {
  input.setCustomError(''); // back to native validity
}
```

## Which controls participate

The validation-message behavior above applies to the **15 form-associated
controls** — the elements that attach `ElementInternals` and report to a host
`<form>`.

> **Two controls are excluded:** `am-search-field` and `am-file-upload` are
> **not** form-associated (they don't attach `ElementInternals` and don't
> participate in `FormData`), so the `setCustomError` / native-message flow does
> not apply to them.

## See also

- **[Usage guide](./usage.md)** — imports, keyboard shortcuts, virtualization.
- **[Theming guide](./theming.md)** — token-based styling, including invalid-state
  colors via `--am-danger`.
- The **Patterns / Validation** Storybook examples are the runnable
  demonstration of the timing model and `setCustomError`.

---

> **Note:** the timing/precedence engine lives in Amris's non-exported internals
> and is **not** a consumer API. The public surface is exactly what's on this page:
> the `setCustomError(message)` method, the reflected `invalid` attribute, and the
> `<am-field>` label/hint/error slots.
