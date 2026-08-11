<!-- GSD:project-start source:PROJECT.md -->

## Project

**Amris**

Amris is a framework-agnostic UI component library built on Lit 3 and Web Components. It ships 60+ Shadow-DOM-encapsulated custom elements (buttons, forms, overlays, navigation, data display) with a `--am-*` design-token system and light/dark theming, usable in plain HTML or any framework (React, Vue, Angular, Svelte). This milestone hardens the existing library into a frozen, production-ready **v1.0** published to GitHub Packages.

**Core Value:** Consumers can drop `@willramanand/amris` into any app and trust the components to be correct, accessible, and API-stable — so the ONE thing that must hold at 1.0 is a **frozen, dependable public API backed by real test coverage**.

### Constraints

- **Tech stack**: Lit 3 + Web Components, Shadow DOM, ESM-only — architectural foundation; do not introduce global CSS or CommonJS
- **Compatibility**: Peer dependency on Lit 3.3.2+; consumers provide Lit — must not bundle it
- **Compatibility**: ElementInternals is not polyfillable; browser floor stays Safari 16.4 — document, do not work around
- **Theming**: All component styling via `--am-*` semantic tokens — no hardcoded colors (breaks dark mode)
- **Security**: Lit-safe templating only — no `innerHTML`/`eval`; keep the property→event, no-global-state model
- **Dependencies**: TypeScript 6.0.3 is very recent — pin to latest stable 5.x if instability surfaces

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 6.0.3 - All source code, configuration, build scripts
- JavaScript (ES2023) - Runtime target, compilation output
- HTML - Component templates via Lit's `html` template tag
- CSS - Styling via Lit's `css` template tag with design tokens

## Runtime

- Node.js 20 (specified in `.github/workflows/ci.yml`)
- npm (uses `package-lock.json`)
- Lockfile: Present (`package-lock.json`)

## Frameworks

- Lit 3.3.2 (peer dependency) - Web components implementation framework
- Purpose: Component authoring with decorators, reactivity, templating
- Storybook 10.3.0 - Component documentation and visual development
- @storybook/web-components-vite 10.3.0 - Storybook integration with Vite
- @storybook/web-components 10.3.0 - Web Components support for Storybook
- Vite 8.0.0 - Development server and production bundler
- Terser 5.46.1 - JavaScript minification
- @lit-labs/rollup-plugin-minify-html-literals 0.2.0 - HTML template literal minification
- Custom Elements Manifest Analyzer 0.11.0 - Web Components metadata generation
- Vitest 4.1.0 - Unit test runner
- @vitest/coverage-v8 4.1.0 - Code coverage reporting

## Key Dependencies

- @floating-ui/dom 1.7.6 - Positioning library for dropdowns, popovers, tooltips, dialogs
- Why it matters: Handles complex positioning calculations for overlay components
- axe-core 4.11.1 - Accessibility testing and WCAG compliance verification
- jsdom 29.0.0 - DOM simulation for headless testing in Vitest
- highlight.js 11.11.1 - Code syntax highlighting for documentation examples
- custom-elements-manifest 2.1.0 - Web Components metadata and tooling
- @changesets/cli 2.6.0 - Semantic versioning and changelog automation
- Purpose: Coordinated release management for component library

## Configuration

- No runtime environment variables required
- Configuration via:
- Target: ES2023
- Module: ESNext
- Strict type checking enabled
- noUnusedLocals and noUnusedParameters enforced
- Experimental decorators enabled for Lit
- DOM library included
- Output directory: `dist`
- Minifier: Terser
- Sourcemaps enabled
- Library format: ES modules only
- External dependencies: `lit`, `@lit/*`, `@floating-ui/*`
- Custom plugins: CSS comment stripping for Lit templates

## Platform Requirements

- Node.js 20
- npm
- TypeScript knowledge (strict typing required)
- Familiarity with Web Components APIs and Lit framework
- Browser support: ES2023-compatible browsers (see `BROWSER_SUPPORT.md`)
- Peer dependency on Lit 3.3.2 or compatible
- Minimal footprint: Component-based, tree-shakeable exports
- No external runtime dependencies for consumers
- Published to GitHub Packages (npm.pkg.github.com)
- Scoped package: @willramanand/amris
- Exports:

## Publishing Configuration

- GitHub Packages (npm.pkg.github.com) - Primary registry
- Package name: @willramanand/amris
- Access level: restricted
- Main entry: `dist/amris.js` (full bundle)
- Core entry: `dist/amris-core.js` (minimal core)
- Component entries: `dist/components/*/index.js`
- Type definitions: `dist/index.all.d.ts`, `dist/index.d.ts`
- Web Components metadata: `dist/custom-elements.json`
- CSS tokens: `dist/styles/tokens.css`

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Component files: kebab-case (e.g., `button.ts`, `accordion.ts`, `avatar.ts`)
- Utility files: kebab-case (e.g., `form-actions.ts`, `unique-id.ts`)
- Style files: kebab-case with `.css.js` suffix (e.g., `reset.css.js`)
- Test files: component-name with `.test.ts` suffix (e.g., `button.test.ts`)
- PascalCase with `Am` prefix (e.g., `AmButton`, `AmInput`, `AmAccordion`, `AmAvatar`)
- All components extend `LitElement`
- Decorated with `@customElement('am-kebab-case')`
- camelCase (e.g., `variant`, `size`, `disabled`, `loading`, `initials`)
- Boolean properties often use `disabled`, `readonly`, `invalid`, `required`, `clearable`
- Type properties: PascalCase exported types (e.g., `ButtonVariant`, `InputSize`, `AvatarShape`)
- camelCase (e.g., `handleClick`, `handleImgError`, `getAssociatedForm`)
- Private methods prefixed with underscore (e.g., `_handleImgError`, `_internals`)
- Descriptive verb-noun pattern (e.g., `handleClick`, `setFormValue`, `checkValidity`)
- camelCase for local variables and instance properties
- Private instance properties prefixed with underscore (e.g., `_internals`, `_imgFailed`, `_headerId`)
- State variables use `@state()` decorator (e.g., `private _imgFailed = false`)
- Exported as `export type` statements at the top of component files
- Union types for variants: `type ButtonVariant = 'primary' | 'outlined' | 'ghost' | 'subtle' | 'danger'`
- Union types for sizes: `type ButtonSize = 'sm' | 'md' | 'lg'`

## Code Style

- Target: ES2023
- Module format: ESNext with bundler module resolution
- No explicit Prettier or ESLint configuration found; reliant on TypeScript strict mode and IDE formatting
- Indentation: 2 spaces (inferred from code samples)
- TypeScript strict mode enforced via `tsconfig.json`
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `noFallthroughCasesInSwitch`: true
- `noUncheckedSideEffectImports`: true
- Strict TypeScript enabled (`strict: true`)
- Generic types used extensively for event handlers and component props
- Type annotations required for function parameters and return types
- Use `type` not `interface` for component prop types exported to consumers

## Import Organization

- Use relative paths with explicit `.js` extensions (e.g., `'../../utilities/form-actions.js'`)
- Default imports for component classes
- Named imports for utilities and types
- Type imports using `import type` syntax when importing only types
- Components in `src/components/{component-name}/`
- Styles in `src/styles/`
- Utilities in `src/utilities/`
- Tokens in `src/tokens/`

## Error Handling

- Errors are handled via state changes, not thrown exceptions
- Error state tracked with boolean flags (e.g., `_imgFailed`)
- Error events emitted from components rather than thrown
- Use `@error` event handlers on elements (e.g., `@error=${this._handleImgError}` on `<img>` tags)
- Form validation uses `internals.setValidity()` for native form validation integration
- Private methods handle errors by setting internal state

## Logging

- No explicit logging found in component code
- Console logging would be used for debugging during development
- Keep logging minimal in production builds

## Comments

- JSDoc comments for all public components
- JSDoc comments for exported types and public methods
- Inline comments for complex logic (e.g., grid-template-rows transitions, animation timing)
- Comments for accessibility patterns and why they're implemented a certain way
- Comments explaining non-obvious conditionals or edge cases
- Brief description at top
- @slot tags for named slots
- @csspart tags for CSS parts
- @cssprop tags for CSS custom properties
- @fires tags for custom events
- @example tags with HTML usage examples
- Used to mark hidden elements (`aria-hidden="true"`)
- Document intent of aria attributes in JSDoc

## Function Design

- Use typed parameters with TypeScript
- Destructure option objects when multiple parameters
- Avoid positional parameters beyond 2-3
- Explicit return type annotations required
- Return `nothing` from Lit templates for conditional rendering
- Return boolean for validation/check methods
- Return `void` for event handlers

## Module Design

- Default export: component class (e.g., `export class AmButton`)
- Named exports: type definitions (e.g., `export type ButtonVariant`)
- Global type declaration at end of file:
- Main entry: `src/index.ts` exports all components and types organized by category
- Core bundle: `src/index.ts` for foundational, layout, form, and feedback components
- All bundle: `src/index.all.ts` for extended components
- One component class per file
- Static styles defined in component file with `static styles = [...]`
- Render method returns `TemplateResult`

## Lit-Specific Patterns

- `@customElement('am-element-name')`: Register custom element
- `@property({ reflect: true })`: Reflect property to attribute
- `@property({ type: Boolean, reflect: true })`: Boolean property with reflection
- `@state()`: Internal state, not reflected to attribute
- `@query()`: Query for child element in shadow DOM
- `@queryAssignedElements()`: Query assigned slot elements
- `constructor()`: Initialize form internals and attach ElementInternals
- `protected updated(changed: PropertyValues)`: Called after property changes
- `render()`: Return template, uses Lit's `html` template tag
- Properties decorated with `@property()` trigger re-render on change
- Use `live()` directive for two-way binding with form inputs
- Use `classMap()` directive for conditional classes

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- Framework-agnostic custom elements usable in any HTML/JS environment
- Lit decorators (`@customElement`, `@property`, `@state`, `@query`) for component metadata
- Shadow DOM for style encapsulation
- Form-associated custom elements (`formAssociated = true`) for native form integration
- Floating UI for positioned overlays (popovers, tooltips, dropdowns)
- CSS custom properties (`--am-*`) for design tokens and theming
- Slots for flexible composition

## Layers

- Purpose: Implement reusable UI components as custom elements
- Location: `src/components/`
- Contains: 60+ Lit-based web components (one component per directory)
- Depends on: Tokens, Utilities, Lit, @floating-ui/dom, ElementInternals API
- Used by: Host applications (web, Lit, React, Vue, Angular, Svelte)
- Entry point per component: `src/components/*/index.ts` (barrel export)
- Purpose: Provide helper functions for common patterns
- Location: `src/utilities/`
- Contains:
- Used by: Components that integrate with HTML forms
- Purpose: Global style utilities and base resets
- Location: `src/styles/`
- Contains:
- Used by: All components
- Purpose: Define design system values
- Location: `src/tokens/`
- Contains:
- Exported as: CSS custom properties (in Shadow DOM) or global stylesheet (`dist/styles/tokens.css`)
- Used by: Components, external applications

## Data Flow

### Primary Request Path (Property to Event)

### Async Component Pattern (e.g., Combobox with server search)

### State Management

- **Properties** (`@property`) — Public API, persist to attributes, one-way data binding
- **State** (`@state`) — Private, internal-only, re-triggers render
- **Queries** (`@query`) — Memoized Shadow DOM element references
- **Element Internals** (`attachInternals()`) — Form-associated state (value, validity)
- Report value to host `<form>` via `setFormValue()`
- Set validation state via `setValidity()`
- Access associated `<label>` via `this._internals.labels`

## Key Abstractions

- Purpose: Register component as HTML custom element with tag name
- Pattern: `@customElement('am-button')`
- Usage: Enables `<am-button></am-button>` in HTML, TypeScript type safety

```typescript

```

```typescript

```

- Components use `<slot></slot>` to accept child content
- Named slots: `<slot name="icon"></slot>` for flexible content positioning
- Enables composition: e.g., `<am-button><am-icon slot="icon"></am-icon>Label</am-button>`
- `classMap()` — Conditional CSS classes
- `live()` — Two-way input binding
- `repeat()` — List rendering with keys
- `nothing` — Conditional rendering (remove element)

## Entry Points

- Location: `src/index.ts` (core) or `src/index.all.ts` (full)
- Triggers: Application imports library
- Responsibilities:
- Location: `src/components/*/index.ts` (barrel export)
- Triggers: Tree-shaking, per-component imports
- Responsibilities:
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

### Accessing Parent Component from Child

### Storing Form Value Outside ElementInternals

### Hardcoded Colors Instead of Tokens

## Error Handling

- **Missing Required Prop:** Component logs warning but renders safely (e.g., missing `label` on input still renders, just without label)
- **Invalid Property Value:** Falls back to default (e.g., invalid `size="XL"` treated as `size="md"`)
- **Form Integration Failure:** Component still renders and emits events even if ElementInternals attach fails (jsdom, old browsers)
- **Floating UI Positioning Failure:** Overlay renders at viewport top-left, still usable

## Cross-Cutting Concerns

- Light theme applied by default via `:host` CSS rules
- Dark theme activated via `<am-theme-provider theme="dark">` component or `data-theme="dark"` on `:root`
- All semantic tokens in `src/tokens/dark.css.ts` override in dark mode
- Exported as global stylesheet `dist/styles/tokens.css` for apps not using theme provider

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
