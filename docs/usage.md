# Using Amris

Amris is a framework-agnostic set of Web Components. Drop the custom elements into
plain HTML or any framework (React, Vue, Angular, Svelte) — you interact with them
through attributes/properties and DOM events, exactly like native elements. This
page covers how to import them, how to wire keyboard shortcuts, and how large lists
virtualize.

> Amris is **ESM-only** and ships `lit` as a **peer dependency** — your app
> provides Lit (`^3.3.2`); Amris does not bundle it.

## Importing components

Amris exposes several entry points so you can pull in exactly as much as you need.
Every import path is tree-shakeable.

### Full bundle

```js
import '@willramanand/amris';
```

Registers every component. Simplest to start with; largest surface.

### Core bundle

```js
import '@willramanand/amris/core';
```

The minimal core set (foundational, layout, form, and feedback components) for
apps that don't need the extended catalog.

### Per-component deep imports (best for tree-shaking)

Import only the components you use:

```js
import '@willramanand/amris/components/button';
import '@willramanand/amris/components/input';
import '@willramanand/amris/components/data-grid';
```

Each `@willramanand/amris/components/<name>` entry registers a single element and
pulls in only its dependencies — the leanest way to ship Amris in production.

### Token stylesheet

If you aren't using `<am-theme-provider>`, import the global token stylesheet once:

```js
import '@willramanand/amris/styles/tokens.css';
```

See the **[theming guide](./theming.md)** for the provider-vs-stylesheet choice.

## Keyboard shortcuts

Amris ships an opt-in keyboard-shortcut registry. Wrap any subtree in the
`<am-shortcuts>` provider element to give that subtree a shortcut registry;
descendants register bindings against it.

```html
<am-shortcuts>
  <!-- your app subtree -->
</am-shortcuts>
```

```js
import '@willramanand/amris/components/shortcuts';

const provider = document.querySelector('am-shortcuts');
const registry = provider.registry;

const result = registry.register({
  id: 'save',
  keys: 'mod+s',        // `mod` = Cmd on macOS, Ctrl elsewhere
  scope: 'global',      // optional; defaults to the global scope
  handler: () => save(),
});

if (!result.ok) {
  // no-throw: inspect result.reason ('conflict' | 'reserved') and result.existingId
  console.warn('shortcut not registered:', result.reason);
}
```

Key behaviors:

- **`register(...)` never throws.** It returns a result union — `{ ok: true }` on
  success, or `{ ok: false, reason, existingId? }` when refused. A same-scope
  collision keeps the **first** binding and reports `reason: 'conflict'` with the
  `existingId`.
- **`mod` / `opt` normalize per platform** — `mod` resolves to Cmd on macOS and
  Ctrl elsewhere; `opt` resolves to Alt. Modifier order doesn't matter.
- **Reserved combos are blocked.** Browser/OS-reserved combinations are refused
  with `reason: 'reserved'` and are never intercepted or `preventDefault()`ed.
- **Single keys are opt-in (WCAG 2.1.4).** A bare single-key shortcut is refused
  unless you pass `allowSingleKey: true`, and single-key shortcuts are suppressed
  while the user is typing in an editable element or composing (IME).

### Command palette

`am-command-palette` works **with or without** a provider:

- **No provider:** it uses its built-in `Cmd/Ctrl+K` document listener.
- **Inside `<am-shortcuts>`:** it registers a **rebindable** `mod+k` through the
  registry (so you can remap it), with the hardcoded fallback dropped while the
  provider is present.

This "provider-or-fallback" design means `am-command-palette` is drop-in by
default and configurable when you want it.

## List virtualization

Large collections virtualize automatically — there is **no public attribute** to
configure, so this stays freeze-neutral. `am-data-grid` (and the combobox/select
option popups) auto-activate a virtualized render path **above ~100 rows**; at or
below that threshold they use the plain render path unchanged. Selection, sort,
and roving focus are identity-keyed, so they survive row recycling as you scroll.

ARIA counts (`aria-rowcount` / `aria-rowindex`) are computed from state, not the
windowed DOM, so assistive tech sees the true totals.

> **Known limitation:** on some mobile screen readers, virtualized (recycled) rows
> can be reported inconsistently as the user scrolls, an inherent trade-off of DOM
> recycling. This is documented, not worked around.

## See also

- **[Theming guide](./theming.md)** — `--am-*` tokens, light/dark, brand overrides.
- **[Validation guide](./validation.md)** — form validation messages and
  `setCustomError`.
- **[Public contract](./contract.md)** — the frozen slot / `::part()` / token
  surface.
