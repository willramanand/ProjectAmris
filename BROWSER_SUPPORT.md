# Browser Support

Amris targets modern evergreen browsers with native web platform features. The library does not ship polyfills.

## Supported floor

| Browser   | Minimum version | Released   |
| --------- | --------------- | ---------- |
| Chrome    | **111**         | March 2023 |
| Edge      | **111**         | March 2023 |
| Safari    | **16.4**        | March 2023 |
| Firefox   | **121**         | December 2023 |

These versions were chosen because they are the lowest where every feature Amris depends on is natively available with no polyfill or behavioral fallback. Below this floor, components either render incorrectly or silently break (e.g. form-associated controls do not participate in `<form>` submission).

## Why this floor — load-bearing features

Each row below is a hard requirement. Removing or polyfilling any of them would require a major rewrite.

| Feature                                | Why we need it                                                                                  | Floor           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------- |
| `ElementInternals` + `formAssociated` (form-association) | Custom form controls (`am-button[type=submit]`, `am-input`, `am-select`, `am-combobox`, `am-rich-select`, `am-date-picker`, `am-time-picker`, `am-color-picker`, `am-slider`, `am-switch`, `am-checkbox`, `am-radio`, `am-textarea`) participate in native `<form>` submission and validation via `attachInternals()` + `setFormValue()`. | Safari **16.4** — empirically confirmed present on Chromium, WebKit, and Firefox evergreen on the widened WebKit/Firefox/Chromium matrix, Phase 10 |
| `ElementInternals` **ARIA reflection** (`internals.role` / `internals.ariaChecked` / `ariaExpanded` …) | Announces role/checked/expanded state to assistive tech from inside the shadow root — probed **independently** of form-association by `capabilities.ts`, because the two sub-capabilities shipped on different dates per engine. | Safari **16.4** — historically flag-gated in Firefox (`accessibility.ARIAReflection.enabled`, Bugzilla 1785412), but **empirically confirmed shipping un-flagged on Firefox 153** (and on Chromium + WebKit) on the widened matrix, Phase 10; the earlier "behind a flag / later" hypothesis is superseded |
| `adoptedStyleSheets`                   | Lit applies component styles via constructable stylesheets.                                     | Safari **16.4**, Firefox **101** |
| Native `<dialog>` + `showModal()`      | Modal dialogs (`am-dialog`, `am-drawer`, `am-command-palette`) use the platform focus trap, top-layer rendering, and backdrop pseudo-element. | Safari **15.4** |
| `:has()`                               | `:not(:has(::slotted(*)))` collapses empty slots in `am-card`, `am-panel`, `am-dialog`, `am-drawer`, `am-side-nav`, `am-app-shell`. | Firefox **121** |
| `color-mix()`                          | Focus-ring tints, hover overlays, destructive menu-item backgrounds.                            | Firefox **113** |
| `backdrop-filter`                      | Blurred overlays in `am-command-palette` and `am-dialog`. (`-webkit-backdrop-filter` is also emitted.) | Firefox **103** |
| Custom Elements v1 + Shadow DOM v1     | Component model.                                                                                | All evergreen |
| ES2022 modules                         | ESM-only distribution.                                                                          | All evergreen |
| CSS Custom Properties                  | Theme tokens.                                                                                   | All evergreen |
| CSS Logical Properties (`margin-inline-start`, `border-inline-end`, `text-align: start`, etc.) | RTL support without conditional styles. | All evergreen |

## Graceful Degradation (v1.1)

The versions above remain the **supported** baseline. But as of v1.1 Amris degrades *deliberately* below the floor instead of silently breaking, and it does so **per capability** rather than all-or-nothing:

1. **Independent capability probing.** `src/internal/helpers/capabilities.ts` probes each sub-capability separately — ElementInternals form-association, ElementInternals ARIA reflection, `adoptedStyleSheets`, and `:has()` — each memoized (probed once per page). Because these features shipped on different dates per engine, a partially-supporting engine degrades one capability at a time rather than falling off a cliff. This is exactly why the floor table above lists **ARIA reflection as its own row, distinct from the form-association row**.

2. **Form controls no longer throw below the floor.** Every form-associated component feature-detects ElementInternals before calling `attachInternals()` (COMPAT-02). Below the ElementInternals floor the constructor no longer throws — the element still upgrades, renders, and emits its normal events. It simply does not participate in native `<form>` submission on its own.

3. **Opt-in form-participation fallback.** Form submission below the floor can be restored by adding one line at app init:

   ```js
   import '@willramanand/amris/compat-forms';
   ```

   This is **OFF by default** — the consumer must opt in. When enabled it engages **only** below the ElementInternals floor and is a no-op at/above it: the hidden-input fallback and the native ElementInternals path are **XOR** — exactly one channel is ever active, never both, so there is no double-submit and no double-validation. The fallback mirrors the control's `value` **and** projects native `required` / `pattern` constraint validation (D-03), so the browser still blocks submit on invalid data below the floor. It does **not** reproduce the library's custom validation-message UI — that remains ElementInternals-dependent and is a documented limit, not a bug.

4. **Below-floor developer signal.** Below the ElementInternals floor **with the fallback OFF**, Amris emits a single, globally-deduplicated `console.warn` naming the missing capability and pointing to the `@willramanand/amris/compat-forms` opt-in (D-04). If the consumer opted into the fallback — or is at/above the floor — it stays silent. The core value is "degrade instead of *silently* failing"; a form that won't submit with no signal is precisely the silent failure this fixes.

5. **Guarded CSS degradation.** Every `:has()`-dependent rule (COMPAT-06) is authored with a functional default outside an `@supports selector(:has(*))` block and the modern enhancement inside it. On engines without `:has()`, empty card / dialog / drawer / panel / side-nav / app-shell slots collapse to a plainer reserved-space layout by design rather than the selector silently failing and rendering wrong. `adoptedStyleSheets` needs no extra guard — Lit's internal `adoptedStyleSheets` → `<style>` fallback already covers it.

## Progressive enhancement

These features look better when supported but degrade gracefully on the floor browsers:

- **`corner-shape: squircle`** — Currently shipping in Chrome / Edge. Falls back to standard `border-radius` everywhere else. Same shape rounding, slightly different curvature. No layout impact.
- **`prefers-reduced-motion: reduce`** — Honored on every transitioning component. Older browsers that ignore the media query fall back to default motion.
- **`prefers-color-scheme: dark`** — `am-theme-provider theme="system"` reads this. If unsupported, the provider stays in light mode.

## What does **not** work below the floor

- Form controls submit no value to their parent `<form>`.
- Empty card / dialog / drawer / panel / side-nav / app-shell slots reserve space instead of collapsing.
- Focus-ring tints and hover overlays render with no color (the `color-mix()` declaration is dropped).
- Modal dialogs that depend on `<dialog>` won't open.

## SSR

Amris is **client-only** today. See [docs/vision.md §17a](./docs/vision.md#17a-ssr-server-side-rendering--current-status). Tokens shipped via `@willramanand/amris/styles/tokens.css` are SSR-safe (plain CSS).

## Verifying

The library does not currently ship cross-browser smoke tests. If you need confidence on a specific target, run the Storybook build (`npm run build:storybook`) against your browser matrix.

## Future work

Lowering the floor below Safari 16.4 / Firefox 121 would require:

- A custom-hidden-input strategy for form-associated components (drops `ElementInternals` requirement).
- JS-driven empty-slot detection (drops `:has()`).
- Pre-mixed color tokens in place of `color-mix()`.

This work is not currently scoped.
