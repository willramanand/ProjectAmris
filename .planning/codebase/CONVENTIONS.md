---
last_mapped_commit: 18f16d20ded8ec01a7526d27623691bc0e7f61c6
last_mapped_at: 2026-08-23T13:39:41-04:00
---
# Coding Conventions

**Analysis Date:** 2026-08-23

Amris is a Lit 3 + Web Components UI library. All source lives under `src/` with TypeScript strict mode. These conventions are enforced by `tsconfig.json` and by consistent authoring patterns across the 60+ components in `src/components/`. There is no ESLint or Prettier config — the compiler's strict flags plus consistent hand-authored style are the enforcement mechanism.

## Naming Patterns

**Files:**

- kebab-case for all source files: `button.ts`, `date-picker.ts`, `form-actions.ts`
- Component directory per component: `src/components/{component-name}/{component-name}.ts` with barrel `index.ts`
- Style files use `.css.js` suffix: `src/styles/reset.css.js`, `src/tokens/dark.css.ts`
- Test files mirror component name with `.test.ts`: `test/components/button.test.ts`
- Browser lane tests: `test/browser/*.test.ts`; perf: `test/perf/*.cdp.test.ts`, `*.perf.test.ts`

**Component classes:**

- PascalCase with `Am` prefix: `AmButton`, `AmDatePicker`, `AmComboBox` (`src/components/button/button.ts:20`)
- Always extend `LitElement`
- Registered via `@customElement('am-kebab-case')` — tag name is always `am-` prefixed (`src/components/button/button.ts:19`)

**Functions / methods:**

- camelCase, verb-noun: `handleClick`, `getAssociatedForm`, `requestAssociatedFormSubmit` (`src/utilities/form-actions.ts`)
- Private methods and instance fields are underscore-prefixed: `_internals`, `_updatePosition`, `_imgFailed`
- Event handlers named `handle*` (`handleClick` at `src/components/button/button.ts:260`)

**Properties / variables:**

- camelCase for public reactive props: `variant`, `size`, `disabled`, `loading`
- Boolean props read as adjectives: `disabled`, `loading`, `readonly`, `invalid`, `required`, `clearable`
- `@state()` for internal-only reactive state, underscore-prefixed: `private _imgFailed = false`

**Types:**

- Exported `type` (never `interface`) for public variant/size unions at top of component file:
  - `export type ButtonVariant = 'primary' | 'outlined' | 'ghost' | 'subtle' | 'danger'` (`src/components/button/button.ts:7`)
  - `export type ButtonSize = 'sm' | 'md' | 'lg'`
- `interface` is used for internal (non-exported) shapes in tooling/harness code (e.g. `ThrottleProfile`, `LifecycleCounts` in `test/perf/harness.ts`)

## Code Style

**Compiler enforcement (`tsconfig.json`):**

- Target `ES2023`, module `ESNext`, `moduleResolution: bundler`
- `strict: true`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`, `noUncheckedSideEffectImports: true`
- `experimentalDecorators: true`, `useDefineForClassFields: false` (required for Lit decorators)
- `verbatimModuleSyntax: true` — forces explicit `import type` for type-only imports
- `erasableSyntaxOnly: true`
- `allowImportingTsExtensions: true`, `noEmit: true` (Vite/tsc split build)

**Formatting (inferred, no formatter configured):**

- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline literals
- Semicolons required

**Linting:** No ESLint/Prettier. Rely on TypeScript strict mode + IDE. Do not add hardcoded colors or CommonJS.

## Import Organization

**Order observed across source and tests:**

1. External packages (`lit`, `lit/decorators.js`, `axe-core`, `vitest`)
2. Internal relative imports (styles, utilities, controllers)

**Rules:**

- Relative imports MUST carry explicit `.js` extension even from `.ts` sources: `'../../utilities/form-actions.js'`, `'../../styles/reset.css.js'` (`src/components/button/button.ts:4-5`)
- Lit directive imports from their own subpaths: `import { classMap } from 'lit/directives/class-map.js'`
- Decorators from `lit/decorators.js`: `import { customElement, property } from 'lit/decorators.js'`
- Type-only imports use `import type` (enforced by `verbatimModuleSyntax`): `import { LitElement, css, html, nothing, type PropertyValues } from 'lit'`
- Peer dependency `lit` is never bundled — always imported, never vendored

## Error Handling

- Errors surface as state changes and events, never thrown exceptions in component runtime paths
- Boolean state flags track error conditions (e.g. `_imgFailed`) toggled by `@error` handlers on `<img>`
- Form validation flows through `ElementInternals.setValidity()` via the shared ValidationController (`src/internal/controllers/`), not thrown errors
- Guard-and-return early pattern for invalid conditions (`src/utilities/form-actions.ts:14-34` returns `false` on disabled/readonly/defaultPrevented/isComposing/no-form)
- Utility functions return `boolean`/`null` sentinels rather than throwing (`getAssociatedForm` returns `null`)
- `try/catch` used only in best-effort teardown/reset paths (e.g. `resetThrottle` in `test/perf/harness.ts:123`)

## Logging

- No runtime logging in component code. Keep production paths silent.

## Comments

- JSDoc on all public components and exported types
- Component-level JSDoc tags: `@slot`, `@csspart`, `@cssprop`, `@fires`, `@example` (see `@cssprop` block at `src/components/button/button.ts:15-18`)
- Inline comments explain non-obvious accessibility choices, animation timing, and browser/jsdom fidelity tradeoffs (test files are heavily annotated with rationale — e.g. `test/setup.ts:113-126`)
- `aria-hidden="true"` decorative elements documented in template (e.g. spinner overlay)

## Function Design

- Typed parameters and explicit return types
- Options-object pattern when more than 2-3 parameters: `requestAssociatedFormSubmit(host, { event, internals, disabled, readonly })` (`src/utilities/form-actions.ts:5`)
- Return `nothing` (from `lit`) for conditional rendering / absent attributes: `aria-busy=${this.loading ? 'true' : nothing}` (`src/components/button/button.ts:287`)
- Return `void` for event handlers, `boolean` for validation/check helpers

## Module Design

- One component class per file
- Default-style export is the component class (`export class AmButton`); named exports for the variant/size types
- Static styles as array combining shared style modules + component `css` literal: `static styles = [resetStyles, focusRingStyles, css\`...\`]` (`src/components/button/button.ts:56`)
- Global type augmentation at end of every component file:
  ```typescript
  declare global {
    interface HTMLElementTagNameMap {
      'am-button': AmButton;
    }
  }
  ```

- Entry points: `src/index.ts` (core bundle), `src/index.all.ts` (full), per-component `src/components/*/index.ts` barrels
- `sideEffects` array in `package.json` scopes tree-shaking to the shipped registration entry points

## Lit-Specific Patterns

- `@customElement('am-*')` registration; `@property({ reflect: true })` for attribute-reflected public API; `@property({ type: Boolean, reflect: true })` for booleans; `@state()` for internal state
- `attachInternals()` in constructor for form-associated components (`static formAssociated = true`)
- Directives: `classMap()` for conditional classes, `live()` for two-way input binding, `repeat()` for keyed lists, `nothing` for conditional rendering
- `protected updated(changed: PropertyValues)` for post-update side effects (`src/components/button/button.ts:251`)

## Theming & Security Constraints

- **Tokens only:** all styling references `--am-*` semantic custom properties (e.g. `var(--am-primary)`, `var(--am-space-4)`). No hardcoded hex/rgb colors — hardcoding breaks dark mode (`src/tokens/dark.css.ts` overrides).
- **Shadow DOM encapsulation:** no global CSS; styles live in each component's `static styles`.
- **Lit-safe templating only:** use the `html` tagged template. No `innerHTML`/`eval` in component code (the only `innerHTML` usage is in the test `fixture()` helper, not shipped code).
- **ESM-only:** no CommonJS, no bundled Lit (peer dependency).

---

*Convention analysis: 2026-08-23*
