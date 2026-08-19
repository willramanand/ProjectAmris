# Theming Amris

Amris is themed entirely through CSS custom properties — the `--am-*` **design
tokens**. Every component reads its colors, typography, spacing, radii, shadows,
and motion from these tokens via `var(--am-*)`, so you re-skin the whole library
by overriding tokens rather than piercing any component's Shadow DOM.

> Looking for the **exhaustive, CI-enforced list** of every frozen token, slot,
> and `::part()`? See **[the frozen public contract](./contract.md)**. This page
> is the *guide* — `contract.md` is the *enumeration*. At v1.0 every name it lists
> is frozen: it will not be renamed or removed within the 1.0 line, and any change
> is a versioned, deliberate release.

## The token architecture

Amris uses a three-layer token model. Each layer builds on the one below it:

1. **Primitive tokens** — raw values (hex colors, rem sizes, pixel values), e.g.
   the `--am-color-primary-50 … --am-color-primary-950` scale. These are the
   palette; they do not change between light and dark.
2. **Semantic tokens** — meaningful, role-based names that map onto primitives,
   e.g. `--am-text`, `--am-surface`, `--am-primary`, `--am-border`,
   `--am-focus-ring`. **This is the layer components consume**, and the layer you
   should override for theming.
3. **Dark overrides** — in dark mode the semantic tokens are remapped to different
   primitives (e.g. `--am-text` flips from a near-black to a near-white), while
   primitive values stay put.

Because components only ever reference **semantic** tokens, switching themes or
rebranding is automatic across all 60+ elements — you never touch component
internals.

> **No hardcoded colors.** Amris never bakes literal colors into a component; all
> styling flows through `--am-*` tokens so dark mode and consumer overrides work.
> Follow the same rule in your own overrides — set token *values*, don't try to
> restyle a component's internals directly.

## Light and dark mode

Amris ships light as the default and a full dark remap. There are two ways to
apply a theme, depending on how you consume the tokens.

### With `<am-theme-provider>` (recommended)

Wrap your app (or any subtree) in `<am-theme-provider>` and set the `theme`
attribute. The provider injects the token layers and cascades them into every
descendant component:

```html
<!-- Follow the OS preference (default) -->
<am-theme-provider theme="system">…</am-theme-provider>

<!-- Force light -->
<am-theme-provider theme="light">…</am-theme-provider>

<!-- Force dark -->
<am-theme-provider theme="dark">…</am-theme-provider>
```

`theme` accepts `"light" | "dark" | "system"` (default `"system"`, which follows
`prefers-color-scheme`). Toggle it dynamically from JavaScript:

```js
const provider = document.querySelector('am-theme-provider');
provider.theme = 'dark'; // 'light' | 'dark' | 'system'
```

The provider also sets `color-scheme` so native form controls and scrollbars
match the active theme.

### With the global stylesheet (no provider)

If you would rather not wrap your app in a provider, import the prebuilt global
stylesheet once (see [Consuming the token stylesheet](#consuming-the-token-stylesheet)
below). It publishes the same tokens on `:root`, and dark mode is controlled by a
`data-theme` attribute on the root element:

```html
<!-- Follow the OS preference (default when data-theme is absent) -->
<html>…</html>

<!-- Force dark -->
<html data-theme="dark">…</html>

<!-- Force light -->
<html data-theme="light">…</html>
```

When `data-theme` is absent the stylesheet follows `prefers-color-scheme`, exactly
like `theme="system"` on the provider.

## Consuming the token stylesheet

For apps that don't use `<am-theme-provider>`, import the prebuilt token
stylesheet, which sets every global token on `:root`:

```js
import '@willramanand/amris/styles/tokens.css';
```

or in plain HTML/CSS:

```css
@import '@willramanand/amris/styles/tokens.css';
```

This is the global-stylesheet alternative to the provider — pick one. The
stylesheet carries the identical primitive → semantic → dark-override layers, with
dark mode driven by `:root[data-theme="dark"]` (and `prefers-color-scheme` when
`data-theme` is unset).

## Rebranding: override semantic (or primitive) tokens

To change the brand, override tokens on the provider, on `:root`, or on any
ancestor element — the new values cascade into every component below.

Remap the primary color scale to re-brand every component at once:

```html
<am-theme-provider style="
  --am-color-primary-50:  #eff6ff;
  --am-color-primary-100: #dbeafe;
  --am-color-primary-200: #bfdbfe;
  --am-color-primary-300: #93c5fd;
  --am-color-primary-400: #60a5fa;
  --am-color-primary-500: #3b82f6;
  --am-color-primary-600: #2563eb;
  --am-color-primary-700: #1d4ed8;
  --am-color-primary-800: #1e40af;
  --am-color-primary-900: #1e3a8a;
  --am-color-primary-950: #172554;
">
  <!-- All components now use blue as the primary color -->
</am-theme-provider>
```

The same approach works for the `secondary`, `success`, `warning`, `danger`, and
`info` palettes — override `--am-color-{role}-{step}`.

For **targeted** changes, override the semantic tokens directly rather than the
whole scale — for example, set `--am-primary`, `--am-surface`, or
`--am-focus-ring` on a container to restyle just that subtree.

### Commonly overridden semantic tokens

| Token | Purpose |
| ----- | ------- |
| `--am-surface` | Default background |
| `--am-surface-raised` | Cards, elevated elements |
| `--am-surface-sunken` | Recessed areas, page background |
| `--am-text` | Primary text |
| `--am-text-secondary` | Secondary text |
| `--am-text-tertiary` | Tertiary / muted text |
| `--am-border` | Default borders |
| `--am-primary` | Primary action color |
| `--am-primary-subtle` | Light primary background |
| `--am-danger` | Destructive actions |
| `--am-success` | Success states |
| `--am-warning` | Warning states |
| `--am-info` | Informational states |
| `--am-focus-ring` | Focus indicator color |

Typography (`--am-font-sans`, `--am-font-mono`, `--am-text-xs … --am-text-6xl`,
`--am-weight-*`, `--am-leading-*`, `--am-tracking-*`), spacing (`--am-space-*`,
on a 4px base unit), radii (`--am-radius-*`), shadows (`--am-shadow-*`), and
motion (`--am-duration-*`, `--am-ease-*`) all follow the same override model. The
complete, frozen list of all global tokens is in
[the public contract](./contract.md).

## Per-component tokens

Beyond the global tokens, some components expose their own
`--am-{component}-*` tokens (documented as `@cssprop`) for tuning a single element
without touching the global scale — e.g. `--am-button-radius`,
`--am-card-padding`, `--am-avatar-size`, `--am-field-gap`. Set them on the element:

```html
<am-button style="--am-button-radius: var(--am-radius-full)">Pill</am-button>
```

The full per-component token list is enumerated in
[the public contract](./contract.md).

## The complete styling API: tokens + `::part()` + slots

`--am-*` tokens are one of three coordinated styling surfaces that together form
Amris's public styling contract:

- **Tokens** (`--am-*`) — re-theme colors, type, spacing, and motion across
  components (this page).
- **`::part()`** — reach specific internal elements a component exposes (e.g.
  `am-input::part(control)`) to adjust layout or add accents the tokens don't
  cover.
- **Slots** — compose content into named regions (e.g. `<am-field>`'s `label`,
  `hint`, and `error` slots).

All three name-sets — token names, part names, and slot names — are **frozen at
v1.0** and enumerated in [the public contract](./contract.md), which CI regenerates
from the Custom Elements Manifest and gates against drift. Build against those
names and trust they will not churn within the 1.0 line.

## See also

- **[Public contract](./contract.md)** — the exhaustive frozen token / slot /
  `::part()` list.
- **[Usage guide](./usage.md)** — imports, keyboard shortcuts, and virtualization.
- **[Validation guide](./validation.md)** — form validation messages.
