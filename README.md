# Amris

Amris is a **framework-agnostic UI component library** built on [Lit 3](https://lit.dev)
and native Web Components. It ships 60+ Shadow-DOM-encapsulated custom elements —
buttons, forms, overlays, navigation, and data display — with a `--am-*` design-token
system and light/dark theming. Drop the `<am-*>` elements into plain HTML or any
framework (React, Vue, Angular, Svelte) and interact with them through attributes,
properties, and DOM events, exactly like native elements.

## Install

Amris is published to **GitHub Packages** (`npm.pkg.github.com`) under the
`@willramanand` scope. Point that scope at the GitHub registry, then install the
package. Add this to your project's `.npmrc`:

```ini
@willramanand:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @willramanand/amris
```

### Peer dependency: Lit

Amris ships `lit` as a **peer dependency** — your app provides Lit, and Amris does
**not** bundle it. Install a compatible Lit alongside Amris:

```bash
npm install lit@^3.3.2
```

Amris is **ESM-only**. There is no CommonJS or UMD build.

## Browser support

Amris targets modern evergreen browsers and **ships no polyfills**. The supported
floor is:

| Browser      | Minimum version |
| ------------ | --------------- |
| Chrome / Edge | **111**        |
| Safari       | **16.4**        |
| Firefox      | **121**         |

This floor is set by `ElementInternals` + form-associated custom elements, which
Amris uses so its form controls (`am-input`, `am-select`, `am-checkbox`, and the
rest) participate in native `<form>` submission and validation via
`attachInternals()`.

> **Below Safari 16.4, form controls silently fail to submit their value.** There is
> no error — the control renders, but it contributes nothing to its parent `<form>`.
> `ElementInternals` is not polyfillable, so this floor is a hard requirement, not a
> configuration option.

For the full feature-by-feature rationale and the list of what degrades below the
floor, see **[BROWSER_SUPPORT.md](./BROWSER_SUPPORT.md)**.

## Quick start

Import a component (this registers the custom element) and drop the tag into your
HTML:

```js
// Import just the component you need — tree-shakeable
import '@willramanand/amris/components/button';
```

```html
<am-button variant="primary">Click me</am-button>
```

Prefer everything at once? Import the full bundle:

```js
import '@willramanand/amris';
```

If you aren't using `<am-theme-provider>`, load the global token stylesheet once so
components pick up the design tokens:

```js
import '@willramanand/amris/styles/tokens.css';
```

That's it — the element behaves like any other DOM node.

## Documentation

- **[Usage guide](./docs/usage.md)** — import entry points, keyboard shortcuts, list virtualization.
- **[Theming guide](./docs/theming.md)** — `--am-*` tokens, light/dark, brand overrides.
- **[Validation guide](./docs/validation.md)** — form validation messages and `setCustomError`.
- **[Public contract](./docs/contract.md)** — the frozen slot / `::part()` / token surface (v1.0 API freeze).
- **[Browser support](./BROWSER_SUPPORT.md)** — the supported floor and the platform features behind it.
- **Storybook** — run `npm run storybook` for interactive component docs and playground.

## Project background

The original vision, roadmap, non-goals, and design-token narrative live in
**[docs/vision.md](./docs/vision.md)** for contributors and anyone interested in the
library's design intent.

## License

MIT
