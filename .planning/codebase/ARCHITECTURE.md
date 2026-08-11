<!-- refreshed: 2026-08-10 -->
# Architecture

**Analysis Date:** 2026-08-10

## System Overview

```text
┌────────────────────────────────────────────────────────────────┐
│                  Web Component Applications                     │
│           (HTML, Lit, React, Vue, Angular, Svelte)             │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                      Components Layer                           │
│              60+ Lit-based Web Components                       │
│                  `src/components/*/`                            │
├─────────────┬──────────────┬──────────────┬────────────────────┤
│ Foundation  │   Layout    │   Form      │  Navigation & Overlay│
│             │             │             │                      │
│ • Button    │ • Card      │ • Input     │  • Dialog            │
│ • Icon      │ • Panel     │ • Checkbox  │  • Drawer            │
│ • Badge     │ • Stack     │ • Select    │  • Tooltip           │
│ • Progress  │ • Grid      │ • ComboBox  │  • Menu              │
│ • Spinner   │ • SplitView │ • DatePicker│  • Dropdown          │
│ • Divider   │ • AppShell  │ • Slider    │  • ContextMenu       │
│             │             │ • FileUpload│  • Popover           │
│             │             │             │  • CommandPalette    │
└─────────────┴──────────────┴──────────────┴────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│              Utilities & Helpers Layer                          │
│                    `src/utilities/`                             │
│                                                                 │
│  • form-actions.ts - Form submission/reset helpers             │
│  • unique-id.ts - ID generation utility                        │
└────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                  Styling & Tokens Layer                        │
│           `src/styles/` | `src/tokens/`                        │
│                                                                 │
│  Tokens:                  │  Styles:                           │
│  • Primitives             │  • Reset styles                    │
│  • Semantic              │  • Focus ring patterns             │
│  • Dark theme variants   │  • Squircle corners                │
│                          │  • CSS custom properties (--am-*)  │
└────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                    Lit Framework                               │
│                   (LitElement, Shadow DOM)                      │
└────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component Category | Responsibility | Files |
|-----------|----------------|------|
| **Foundation** | Base styling, icons, progress, dividers, spinners, surfaces | `src/components/button/`, `icon/`, `badge/`, `spinner/`, `divider/` |
| **Layout** | Spatial composition, app structure | `src/components/card/`, `panel/`, `stack/`, `grid/`, `split-view/`, `app-shell/` |
| **Form Inputs** | User data entry with form integration | `src/components/input/`, `checkbox/`, `select/`, `radio/`, `slider/`, `combobox/`, `date-picker/`, `file-upload/` |
| **Navigation** | Content navigation and wayfinding | `src/components/tabs/`, `accordion/`, `breadcrumb/`, `pagination/`, `nav-bar/`, `side-nav/` |
| **Feedback** | Status, alerts, toast notifications | `src/components/alert/`, `badge/`, `progress/`, `progress-ring/`, `toast/`, `status-dot/` |
| **Data Display** | Content rendering | `src/components/avatar/`, `skeleton/`, `empty-state/`, `list/`, `table/`, `data-grid/`, `timeline/`, `stat/` |
| **Overlays** | Floating UI patterns | `src/components/dialog/`, `tooltip/`, `popover/`, `menu/`, `dropdown/`, `context-menu/`, `drawer/`, `command-palette/` |
| **Theme Provider** | Design system theming | `src/components/theme-provider/` |

## Pattern Overview

**Overall:** Component library using **Web Components + Lit** with **Shadow DOM encapsulation** and **CSS custom properties** for theming.

**Key Characteristics:**
- Framework-agnostic custom elements usable in any HTML/JS environment
- Lit decorators (`@customElement`, `@property`, `@state`, `@query`) for component metadata
- Shadow DOM for style encapsulation
- Form-associated custom elements (`formAssociated = true`) for native form integration
- Floating UI for positioned overlays (popovers, tooltips, dropdowns)
- CSS custom properties (`--am-*`) for design tokens and theming
- Slots for flexible composition

## Layers

**Components Layer:**
- Purpose: Implement reusable UI components as custom elements
- Location: `src/components/`
- Contains: 60+ Lit-based web components (one component per directory)
- Depends on: Tokens, Utilities, Lit, @floating-ui/dom, ElementInternals API
- Used by: Host applications (web, Lit, React, Vue, Angular, Svelte)
- Entry point per component: `src/components/*/index.ts` (barrel export)

**Utilities Layer:**
- Purpose: Provide helper functions for common patterns
- Location: `src/utilities/`
- Contains:
  - `form-actions.ts` - Trigger form submission/reset on host form
  - `unique-id.ts` - Generate unique IDs for form labels and inputs
- Used by: Components that integrate with HTML forms

**Styles Layer:**
- Purpose: Global style utilities and base resets
- Location: `src/styles/`
- Contains:
  - `reset.css.ts` - Reset native element styles
  - `focus-ring.css.ts` - Focus-visible ring pattern
  - `corners.css.ts` - Squircle corner animation utilities
- Used by: All components

**Tokens Layer:**
- Purpose: Define design system values
- Location: `src/tokens/`
- Contains:
  - `primitives.css.ts` - Base colors, spacing, sizing, typography
  - `semantic.css.ts` - Semantic token aliases (e.g., `--am-color-primary`)
  - `dark.css.ts` - Dark mode overrides
- Exported as: CSS custom properties (in Shadow DOM) or global stylesheet (`dist/styles/tokens.css`)
- Used by: Components, external applications

## Data Flow

### Primary Request Path (Property to Event)

1. **Attribute/Property Set** — Application sets component property
   - Example: `combobox.value = "Canada"` or `<am-input value="text"></am-input>`
   
2. **Component Updates** — Lit detects property change via `@property` decorator
   - Updates internal state if needed (e.g., `@state() _filtered: string[] = []`)
   - Calls `updated()` or `willUpdate()` lifecycle hooks
   - Triggered by `updateComplete` promise
   
3. **Render** — `render()` template updates via `html` template literal
   - Uses Lit directives (`classMap`, `live`, `repeat`, etc.)
   - Binds event listeners: `@click="${this._handleClick}"`, `@input="${this._onInput}"`
   - Updates Shadow DOM incrementally
   
4. **Event Dispatch** — Component fires event on user interaction
   - Native events: `input`, `change`, `click`, `keydown`
   - Custom events: `am-search`, `am-select`, custom behaviors
   - Example: `this.dispatchEvent(new CustomEvent('am-search', { detail: { query } }))`
   
5. **Form Integration** (form-associated components)
   - Component calls `this._internals.setFormValue(value)` to report value
   - Component calls `this._internals.setValidity()` for validation state
   - Host form sees component as standard form control

### Async Component Pattern (e.g., Combobox with server search)

1. Application sets `combobox.async = true`
2. User types in input → `input` event fires
3. Component fires `am-search` event with `{ query }` detail
4. Application fetches results: `cb.options = await fetch()`
5. Component renders updated options
6. User selects option → `change` event fires

### State Management

- **Properties** (`@property`) — Public API, persist to attributes, one-way data binding
- **State** (`@state`) — Private, internal-only, re-triggers render
- **Queries** (`@query`) — Memoized Shadow DOM element references
- **Element Internals** (`attachInternals()`) — Form-associated state (value, validity)

Form-associated components use `this._internals` to:
- Report value to host `<form>` via `setFormValue()`
- Set validation state via `setValidity()`
- Access associated `<label>` via `this._internals.labels`

## Key Abstractions

**CustomElement Decorator:**
- Purpose: Register component as HTML custom element with tag name
- Pattern: `@customElement('am-button')`
- Usage: Enables `<am-button></am-button>` in HTML, TypeScript type safety

**Property Decorators:**
```typescript
@property()                    // public API, reflects to attribute
@property({ type: Boolean })   // boolean properties
@property({ reflect: true })   // two-way attribute binding
@state()                       // private, triggers re-render
@query('#selector')            // cached DOM reference
```

**Form-Associated Pattern:**
```typescript
static formAssociated = true;  // makes element a form control
private _internals = this.attachInternals();  // access form API
this._internals.setFormValue(value);          // report to form
this._internals.setValidity(...);             // validation state
```

**Slot-Based Composition:**
- Components use `<slot></slot>` to accept child content
- Named slots: `<slot name="icon"></slot>` for flexible content positioning
- Enables composition: e.g., `<am-button><am-icon slot="icon"></am-icon>Label</am-button>`

**Lit Directives:**
- `classMap()` — Conditional CSS classes
- `live()` — Two-way input binding
- `repeat()` — List rendering with keys
- `nothing` — Conditional rendering (remove element)

## Entry Points

**Library Bundle Entry:**
- Location: `src/index.ts` (core) or `src/index.all.ts` (full)
- Triggers: Application imports library
- Responsibilities:
  - Exports component classes, types, tokens, utilities
  - Core bundle includes ~40 foundational components
  - Full bundle includes all 60+ components

**Component-Specific Entry:**
- Location: `src/components/*/index.ts` (barrel export)
- Triggers: Tree-shaking, per-component imports
- Responsibilities:
  - Re-exports component class and types
  - Built into separate chunk: `dist/components/*/index.js`

**Built Distribution:**
- `dist/amris.js` — Full library (all components)
- `dist/amris-core.js` — Core bundle (essential components)
- `dist/components/*/index.js` — Individual component chunks
- `dist/styles/tokens.css` — Global tokens stylesheet alternative
- `dist/custom-elements.json` — Component metadata (generated by `cem`)

## Architectural Constraints

- **Shadow DOM Encapsulation:** Each component uses Shadow DOM for style isolation. Parent styles do NOT cascade into components; use CSS custom properties (`--am-*`) for theming.
  
- **No Global State:** Components are stateless. State lives in application or in component instance properties. No module-level singletons.

- **Form Integration via ElementInternals:** Form-associated components (`<am-input>`, `<am-checkbox>`, etc.) use `ElementInternals` API instead of form submission listeners. Components set `this._internals.setFormValue()` to integrate with native forms.

- **Lit Dependency:** Entire library depends on Lit 3.3.2+. Applications must provide `lit` as peer dependency.

- **Floating UI for Positioning:** Overlay components (dialog, tooltip, popover, dropdown) use `@floating-ui/dom` for auto-positioning. Initializes with `autoUpdate()` to track position changes.

- **Module Format:** ES modules (ESNext) only. No CommonJS or UMD. Tree-shaking friendly via `sideEffects` array in package.json.

- **TypeScript Strict Mode:** All source files use `strict: true`, `noUnusedLocals`, `noUnusedParameters`. Proper typing is enforced at build time.

## Anti-Patterns

### Global CSS Resets in Components

**What happens:** Component imports reset styles globally (e.g., `resetStyles` applied to every component's Shadow DOM)

**Why it's wrong:** Bloats bundle when many components are used together (same styles imported multiple times)

**Do this instead:** Reset styles are defined once in `src/styles/reset.css.ts` and imported where needed. Let bundler deduplicate.

### Accessing Parent Component from Child

**What happens:** Child component queries DOM to find parent component, relies on parent structure

**Why it's wrong:** Breaks when DOM structure changes, creates hidden dependencies, couples components tightly

**Do this instead:** Use properties and events. Parent sets property on child, child fires event to notify parent. Example: `<am-tabs>` (parent) holds active tab state, `<am-tab>` (child) fires `am-select` event upward.

### Storing Form Value Outside ElementInternals

**What happens:** Form-associated component keeps value in component property but doesn't call `this._internals.setFormValue()`

**Why it's wrong:** Host form doesn't see the component's value during form submission

**Do this instead:** Always call `this._internals.setFormValue(this.value)` when value changes. Form integration tests verify this works.

### Hardcoded Colors Instead of Tokens

**What happens:** Component uses hardcoded hex colors (e.g., `color: #3b82f6`) instead of CSS custom properties

**Why it's wrong:** Breaks dark theme, prevents customization, increases maintenance burden

**Do this instead:** Use semantic tokens: `color: var(--am-color-primary)`. Defined in `src/tokens/semantic.css.ts`.

## Error Handling

**Strategy:** Graceful degradation with developer warnings

**Patterns:**
- **Missing Required Prop:** Component logs warning but renders safely (e.g., missing `label` on input still renders, just without label)
- **Invalid Property Value:** Falls back to default (e.g., invalid `size="XL"` treated as `size="md"`)
- **Form Integration Failure:** Component still renders and emits events even if ElementInternals attach fails (jsdom, old browsers)
- **Floating UI Positioning Failure:** Overlay renders at viewport top-left, still usable

## Cross-Cutting Concerns

**Logging:** No logging in production builds. During development, components may use `console.warn()` for configuration issues or accessibility violations.

**Validation:** Form-associated components implement HTML5 validation API via `ElementInternals.setValidity()`. Custom validation done on host application; component only reports state.

**Authentication:** Not applicable. Components are UI primitives, zero knowledge of auth.

**Theme Support:** 
- Light theme applied by default via `:host` CSS rules
- Dark theme activated via `<am-theme-provider theme="dark">` component or `data-theme="dark"` on `:root`
- All semantic tokens in `src/tokens/dark.css.ts` override in dark mode
- Exported as global stylesheet `dist/styles/tokens.css` for apps not using theme provider

---

*Architecture analysis: 2026-08-10*
