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
| `ElementInternals` + `formAssociated`  | Custom form controls (`am-button[type=submit]`, `am-input`, `am-select`, `am-combobox`, `am-rich-select`, `am-date-picker`, `am-time-picker`, `am-color-picker`, `am-slider`, `am-switch`, `am-checkbox`, `am-radio`, `am-textarea`) participate in native `<form>` submission and validation via `attachInternals()`. | Safari **16.4** |
| `adoptedStyleSheets`                   | Lit applies component styles via constructable stylesheets.                                     | Safari **16.4**, Firefox **101** |
| Native `<dialog>` + `showModal()`      | Modal dialogs (`am-dialog`, `am-drawer`, `am-command-palette`) use the platform focus trap, top-layer rendering, and backdrop pseudo-element. | Safari **15.4** |
| `:has()`                               | `:not(:has(::slotted(*)))` collapses empty slots in `am-card`, `am-panel`, `am-dialog`, `am-drawer`, `am-side-nav`, `am-app-shell`. | Firefox **121** |
| `color-mix()`                          | Focus-ring tints, hover overlays, destructive menu-item backgrounds.                            | Firefox **113** |
| `backdrop-filter`                      | Blurred overlays in `am-command-palette` and `am-dialog`. (`-webkit-backdrop-filter` is also emitted.) | Firefox **103** |
| Custom Elements v1 + Shadow DOM v1     | Component model.                                                                                | All evergreen |
| ES2022 modules                         | ESM-only distribution.                                                                          | All evergreen |
| CSS Custom Properties                  | Theme tokens.                                                                                   | All evergreen |
| CSS Logical Properties (`margin-inline-start`, `border-inline-end`, `text-align: start`, etc.) | RTL support without conditional styles. | All evergreen |

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

Amris is **client-only** today. See [README §17a](./README.md#17a-ssr-server-side-rendering--current-status). Tokens shipped via `@willramanand/amris/styles/tokens.css` are SSR-safe (plain CSS).

## Verifying

The library does not currently ship cross-browser smoke tests. If you need confidence on a specific target, run the Storybook build (`npm run build:storybook`) against your browser matrix.

## Future work

Lowering the floor below Safari 16.4 / Firefox 121 would require:

- A custom-hidden-input strategy for form-associated components (drops `ElementInternals` requirement).
- JS-driven empty-slot detection (drops `:has()`).
- Pre-mixed color tokens in place of `color-mix()`.

This work is not currently scoped.
