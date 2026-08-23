---
last_mapped_commit: 18f16d20ded8ec01a7526d27623691bc0e7f61c6
last_mapped_at: 2026-08-23T13:39:41-04:00
---
<!-- refreshed: 2026-08-23 -->

# Architecture

**Analysis Date:** 2026-08-23

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Application                       │
│         (plain HTML / React / Vue / Angular / Svelte)        │
│      provides `lit` peer dep; imports @willramanand/amris     │
└──────────────────┬──────────────────┬───────────────────────┘
                   │                  │
       full bundle │                  │ core / per-component
                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Public Entry Points                        │
│   `src/index.ts` (core)   `src/index.all.ts` (all)          │
│   per-component barrels: `src/components/<name>/index.ts`     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Component Layer (67 custom elements)            │
│  `src/components/<name>/<name>.ts` — Shadow-DOM LitElements  │
│  @customElement, @property, @state, @query; formAssociated   │
└────────┬──────────────────┬─────────────────┬───────────────┘
         │                  │                 │
         ▼                  ▼                 ▼
┌──────────────────┐ ┌───────────────┐ ┌─────────────────────┐
│ Internal Chokepoint│ │ Tokens        │ │ Styles / Utilities  │
│ `src/internal/`   │ │ `src/tokens/` │ │ `src/styles/`,      │
│ controllers +      │ │ --am-* CSS    │ │ `src/utilities/`    │
│ helpers            │ │ custom props  │ │                     │
└────────┬───────────┘ └───────────────┘ └─────────────────────┘
         │ lazy dynamic import() (memoized)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  External runtime deps (kept `external`, never bundled)      │
│  `@floating-ui/dom`, `@lit-labs/virtualizer`, `lit`          │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Component element | One custom element per file; Shadow-DOM UI, public API | `src/components/<name>/<name>.ts` |
| Component barrel | Re-export element + types for deep imports | `src/components/<name>/index.ts` |
| FloatingPositionController | Overlay positioning chokepoint over `@floating-ui/dom` | `src/internal/controllers/floating-position.ts` |
| ValidationController | Resolves displayed validation message/state from ElementInternals + custom error | `src/internal/controllers/validation.ts` |
| ListboxNavController | Keyboard navigation for listbox/option patterns | `src/internal/controllers/listbox-nav.ts` |
| option-filter | Client-side option filtering for combobox/select | `src/internal/controllers/option-filter.ts` |
| shortcut-registry | Keyboard shortcut registration/dispatch | `src/internal/controllers/shortcut-registry.ts` |
| lazy-load | Memoized dynamic-`import()` of heavy runtime deps | `src/internal/helpers/lazy-load.ts` |
| virtualize-support | Row-threshold + windowing helpers for large lists/grids | `src/internal/helpers/virtualize-support.ts` |
| teardown-scope | Grouped listener/cleanup lifecycle helper | `src/internal/helpers/teardown-scope.ts` |
| date-utils / time-utils | Date/time math for calendar, date/time pickers | `src/internal/helpers/date-utils.ts`, `time-utils.ts` |
| Tokens | Design-system values as `--am-*` CSS custom properties | `src/tokens/` |
| form-actions | Native form submit/reset helpers for form-associated elements | `src/utilities/form-actions.ts` |

## Pattern Overview

**Overall:** Framework-agnostic Web Components library — Shadow-DOM-encapsulated Lit 3 custom elements over a shared internal chokepoint layer, with lazy-loaded heavy dependencies.

**Key Characteristics:**

- One component class per file, registered via `@customElement('am-*')`, extending `LitElement`
- Shadow DOM style encapsulation per component; theming only through `--am-*` tokens (no global CSS cascade in)
- Property→event data flow, no global/module-level mutable state (loader caches in `lazy-load.ts` are the deliberate, memoization-only exception)
- Form integration via `ElementInternals` (`static formAssociated = true`), never form-submit listeners
- Heavy deps (`@floating-ui/dom`, `@lit-labs/virtualizer`) are dynamically imported and memoized; they stay `external` so the consumer's bundler resolves them
- Dual public entry points (core vs all) plus per-component deep imports for tree-shaking

## Layers

**Public Entry Layer:**

- Purpose: Define the frozen public surface and bundle boundaries
- Location: `src/index.ts` (core), `src/index.all.ts` (all), `src/components/<name>/index.ts` (deep imports)
- Contains: Named re-exports of component classes + exported types, tokens, styles, utilities
- Depends on: Component layer, tokens, styles, utilities
- Used by: Consumer applications and bundlers

**Component Layer:**

- Purpose: Implement each UI component as a Shadow-DOM custom element
- Location: `src/components/<name>/<name>.ts`
- Contains: 67 Lit-based web components (one directory per component)
- Depends on: Internal controllers/helpers, tokens, styles, utilities, Lit
- Used by: Entry points, host applications

**Internal Chokepoint Layer:**

- Purpose: Concentrate cross-cutting logic (positioning, validation, listbox nav, filtering, lazy-loading, virtualization) so components stay thin and deps stay isolated
- Location: `src/internal/controllers/`, `src/internal/helpers/`
- Contains: Lit `ReactiveController`s and stateless helpers; registers NO custom element and is never re-exported from a public barrel
- Depends on: Lit, external deps (lazily), DOM APIs
- Used by: Component layer only

**Tokens / Styles / Utilities:**

- Purpose: Shared design tokens, base resets, and form/id helpers
- Location: `src/tokens/`, `src/styles/`, `src/utilities/`
- Contains: `primitives.css.ts`, `semantic.css.ts`, `dark.css.ts`; `reset.css.ts`, `corners.css.ts`; `form-actions.ts`, `unique-id.ts`
- Used by: All components; tokens also emitted as global `dist/styles/tokens.css`

## Data Flow

### Primary Request Path (Property → Event)

1. Host sets a public `@property` on the element (e.g. `.options`, `value`) (`src/components/combobox/combobox.ts`)
2. Lit reactivity triggers `render()`; internal `@state` and controllers update (`src/internal/controllers/*.ts`)
3. Form-associated components mirror state to the host `<form>` via `ElementInternals.setFormValue()`/`setValidity()`
4. Component emits DOM events (`input`, `change`, custom `am-*`) that the host listens to (`combobox.ts` fires `am-search`)

### Overlay Positioning Flow

1. Component constructs a `FloatingPositionController` with `reference`/`floating` accessor callbacks (`src/internal/controllers/floating-position.ts`)
2. On trigger intent (`pointerenter`/`focus`) the component calls `prefetchFloating()` to warm the chunk (`src/internal/helpers/lazy-load.ts:47`)
3. On open, controller `await`s `loadFloating()` (memoized dynamic import) then runs `computePosition` with the `offset → flip → shift` middleware stack
4. `autoUpdate` keeps the floating element positioned; `_updatePosition` is the instrumented perf chokepoint

### Large-List Virtualization Flow

1. Near `VIRTUALIZE_ROW_THRESHOLD`, component calls `prefetchVirtualizer()` (`src/internal/helpers/lazy-load.ts:68`)
2. Until `loadVirtualizer()` resolves, the component renders with `repeat()` (cold frame), then swaps to the windowed `virtualize()` directive (`src/internal/helpers/virtualize-support.ts`)

**State Management:**

- `@property` — public API, one-way binding, may reflect to attribute
- `@state` — private, re-triggers render, never reflected
- `@query` — memoized Shadow-DOM element refs
- `ElementInternals` — form-associated value/validity state
- No module-level app state; memoized loader promises in `lazy-load.ts` are the only intentional module-level singletons

## Key Abstractions

**Reactive Controllers:**

- Purpose: Encapsulate reusable cross-component behavior with host lifecycle hooks
- Examples: `src/internal/controllers/floating-position.ts`, `validation.ts`, `listbox-nav.ts`, `shortcut-registry.ts`
- Pattern: Implement Lit `ReactiveController`; take accessor-callback options so hosts resolve their own Shadow-DOM nodes lazily

**Memoized Lazy Loaders:**

- Purpose: Load heavy interaction-gated deps exactly once, keeping them `external`
- Examples: `loadFloating`/`prefetchFloating`, `loadVirtualizer`/`prefetchVirtualizer` (`src/internal/helpers/lazy-load.ts`)
- Pattern: Module-level promise cache assigned with `??=`; static bare specifiers only (never computed paths)

**Design Tokens:**

- Purpose: Themeable, dark-mode-safe styling surface
- Examples: `src/tokens/primitives.css.ts`, `semantic.css.ts`, `dark.css.ts`
- Pattern: `--am-*` CSS custom properties consumed in `css` template blocks

## Entry Points

**Core bundle:**

- Location: `src/index.ts` → `dist/amris-core.js` (package export `./core`)
- Triggers: Consumer imports foundational/common components
- Responsibilities: Export foundation, layout, basic form, common feedback components + tokens/styles/utilities

**All bundle:**

- Location: `src/index.all.ts` → `dist/amris.js` (package export `.`, the default)
- Triggers: Consumer imports the full library
- Responsibilities: Export every component and type

**Per-component barrels:**

- Location: `src/components/<name>/index.ts` (`export * from './<name>.js'`) → `dist/components/*/index.js` (package export `./components/*`)
- Triggers: Deep imports for maximum tree-shaking

## Architectural Constraints

- **Module format:** ESM only (ESNext). No CommonJS/UMD. `sideEffects` array in `package.json` guards tree-shaking.
- **External deps:** `lit`, `@lit/*`, `@lit-labs/*`, `@floating-ui/*` are marked `external` in `vite.config.ts:241` and must never be bundled (asserted by `scripts/assert-no-bundled-lit.mjs` and `test/no-bundled-lit.test.ts`).
- **Global state:** None at app level; only the memoization promise caches in `src/internal/helpers/lazy-load.ts` (test-resettable via `__resetLazyLoadCachesForTest`).
- **Internal isolation:** Nothing under `src/internal/` may be re-exported from `src/index.ts`/`src/index.all.ts`; it must never appear on the frozen CEM/public surface.
- **Shadow DOM:** Parent styles do not cascade in; theming only via `--am-*` tokens.
- **Browser floor:** Safari 16.4 (ElementInternals is not polyfillable) — see `BROWSER_SUPPORT.md`.
- **TypeScript strict mode:** `strict`, `noUnusedLocals`, `noUnusedParameters` enforced.

## Anti-Patterns

### Re-exporting internal modules from a public barrel

**What happens:** Adding an `export` of a `src/internal/` symbol to `src/index.ts`/`src/index.all.ts`.
**Why it's wrong:** Expands the frozen v1.0 public API/CEM surface with implementation detail (D-06/D-09). Internals are meant to change freely.
**Do this instead:** Import internals only from component/controller source; keep them off every barrel.

### Bundling or origin-qualifying heavy deps

**What happens:** Static-importing `@floating-ui/dom`/virtualizer eagerly, or building a computed `import()` path.
**Why it's wrong:** Defeats externalization and duplicates deps in consumer bundles; opens a dynamic-code/supply-chain seam.
**Do this instead:** Use the memoized loaders in `src/internal/helpers/lazy-load.ts` with static bare specifiers.

### Hardcoded colors instead of tokens

**What happens:** Literal color values in a component's `css` block.
**Why it's wrong:** Breaks dark mode (dark theme overrides `--am-*` tokens only).
**Do this instead:** Reference `--am-*` semantic tokens from `src/tokens/semantic.css.ts`.

### Storing form value outside ElementInternals

**What happens:** Tracking a form control's value in an ad-hoc property and wiring form submit listeners.
**Why it's wrong:** Breaks native form participation, validity, and label association.
**Do this instead:** `static formAssociated = true`; report via `setFormValue()`/`setValidity()` through `ValidationController` (`src/internal/controllers/validation.ts`).

## Error Handling

**Strategy:** State-driven, not exception-driven. Errors surface as boolean `@state` flags and emitted events.

**Patterns:**

- Missing/invalid props fall back to safe defaults rather than throwing
- Form validation flows through `ElementInternals.setValidity()` + `ValidationController`
- Floating-UI/virtualizer load failures degrade gracefully (repeat() fallback, viewport-anchored render)

## Cross-Cutting Concerns

**Positioning:** Centralized in `FloatingPositionController` over lazily-loaded `@floating-ui/dom`.
**Validation:** Centralized in `ValidationController` over `ElementInternals`.
**Theming:** `--am-*` tokens; light default via `:host`, dark via `am-theme-provider` / `data-theme="dark"`.
**Perf measurement:** `test/perf/harness.ts` throttles (CDP) and instruments first-party Lit lifecycle + `_updatePosition` chokepoint; browser lane in `test/browser/` gates overlay/virtualization regressions.

---

*Architecture analysis: 2026-08-23*
