# Codebase Structure

**Analysis Date:** 2026-08-10

## Directory Layout

```
ProjectAmris/
├── .claude/                    # Claude Code configuration
├── .changeset/                 # Changesets for versioning
├── .github/                    # GitHub workflows
├── .planning/                  # Planning documents and analysis (this dir)
├── .storybook/                 # Storybook configuration
├── coverage/                   # Code coverage reports (generated)
├── dist/                       # Build output (generated)
├── docs/                       # Static documentation
├── node_modules/               # Dependencies (generated)
├── public/                     # Public assets served by dev server
├── scripts/                    # Build and utility scripts
├── src/                        # Source code (primary development)
│   ├── components/             # 60+ web components
│   ├── styles/                 # Global style utilities
│   ├── tokens/                 # Design system tokens
│   ├── utilities/              # Helper functions
│   ├── stories/                # Storybook component documentation
│   ├── index.ts                # Core bundle entry point
│   ├── index.all.ts            # Full bundle entry point
│   ├── index.css               # Global styles
│   └── [component].stories.ts  # Component examples
├── test/                       # Test files
│   ├── components/             # Component tests (mirrors src/components/)
│   ├── setup.ts                # Vitest setup and mocks
│   ├── helpers.ts              # Test utilities and fixtures
│   ├── a11y.test.ts            # Accessibility audit tests
│   └── a11y-helper.ts          # Accessibility test utilities
├── .env.example                # Environment variable template
├── custom-elements-manifest.config.js  # Custom Elements Manifest config
├── package.json                # Dependencies, scripts, exports
├── tsconfig.json               # TypeScript configuration
├── tsconfig.types.json         # TypeScript config for type generation
├── vite.config.ts              # Vite dev server and build config
├── vitest.config.ts            # Vitest test runner config
├── README.md                   # Project overview and roadmap
└── [other config files]        # Changesets, git, etc.
```

## Directory Purposes

**`src/components/`:**
- Purpose: Contains all 60+ web components
- Layout: One directory per component (e.g., `src/components/button/`, `src/components/card/`)
- Each component directory contains:
  - `component-name.ts` - Main component class (LitElement)
  - `index.ts` - Barrel export (`export * from './component-name.js'`)
  - Optionally: related types or internal utilities
- Key files:
  - `src/components/theme-provider/` - Provides theming via `<am-theme-provider>`
  - `src/components/button/` - Base interactive element
  - `src/components/icon/` - Icon system
  - `src/components/input/`, `checkbox/`, `select/` - Form controls
  - `src/components/dialog/`, `popover/`, `tooltip/` - Overlay components

**`src/styles/`:**
- Purpose: Global style utilities and base resets
- Contains:
  - `reset.css.ts` - Reset native HTML element styles (imported by components)
  - `focus-ring.css.ts` - Focus-visible ring pattern
  - `corners.css.ts` - Squircle corner animation utilities
- Exported: Imported by components, not meant for direct application use

**`src/tokens/`:**
- Purpose: Design system values and theme definitions
- Contains:
  - `primitives.css.ts` - Base design tokens (colors, spacing, sizing, typography)
  - `semantic.css.ts` - Semantic aliases (e.g., `--am-color-primary` → `--am-color-blue-600`)
  - `dark.css.ts` - Dark mode token overrides
  - `index.ts` - Exports all token objects for programmatic use
- Exported: As CSS custom properties in Shadow DOM and global stylesheet
- Key tokens: `--am-color-*`, `--am-spacing-*`, `--am-radius-*`, `--am-weight-*`

**`src/utilities/`:**
- Purpose: Reusable helper functions
- Contains:
  - `form-actions.ts` - `requestAssociatedFormSubmit()`, `resetAssociatedForm()` for triggering form events
  - `unique-id.ts` - `uniqueId()` for generating unique IDs, `resetUniqueIdCounter()` for testing
- Exported: Used by components, available to applications

**`src/stories/`:**
- Purpose: Storybook component examples and documentation
- Layout: One `.stories.ts` file per component (e.g., `button.stories.ts`, `combobox.stories.ts`)
- Contains: Component usage examples, prop variations, documentation
- Triggered by: `npm run storybook` for interactive dev
- Built by: `npm run build:storybook` for static site

**`test/`:**
- Purpose: Component and integration tests
- Layout:
  - `test/components/` - Test files mirror component structure (e.g., `test/components/button.test.ts`)
  - `test/setup.ts` - Vitest configuration and DOM mocks (ElementInternals, ResizeObserver, dialog polyfills)
  - `test/helpers.ts` - Test utilities: `fixture()`, `shadowQuery()`, `click()`, `keydown()`, `inputText()`, `oneEvent()`
  - `test/a11y.test.ts` - Accessibility audit using axe-core
- Framework: Vitest + jsdom + custom element testing helpers
- Coverage: Collected via `npm run test:coverage`

**`scripts/`:**
- Purpose: Build automation and utility scripts
- Key files:
  - `scripts/build-tokens-css.mjs` - Generates `dist/styles/tokens.css` from token modules

**`dist/` (generated):**
- Purpose: Published library build
- Layout:
  - `dist/amris.js` - Full library bundle (all components)
  - `dist/amris-core.js` - Core bundle (essential components)
  - `dist/components/*/index.js` - Individual component chunks
  - `dist/index.all.d.ts`, `dist/index.d.ts` - Type definitions
  - `dist/custom-elements.json` - Component metadata for tooling
  - `dist/styles/tokens.css` - Global tokens stylesheet (alternative to theme provider)
  - `dist/chunks/` - Code-split chunks
  - `dist/assets/` - Generated CSS and other assets
- Generated by: `npm run build` (only committed after release)

**`.storybook/`:**
- Purpose: Storybook documentation site configuration
- Contains:
  - `main.ts` - Storybook framework setup (web-components + Vite)
  - `preview.ts` - Global story configuration and decorators

**`.planning/codebase/`:**
- Purpose: Project architecture and implementation guides (this directory)
- Contents: Generated by `/gsd-map-codebase` skill
  - `ARCHITECTURE.md` - System architecture, patterns, data flow
  - `STRUCTURE.md` - Directory layout and file purposes (this file)
  - `CONVENTIONS.md` - Code style and naming patterns
  - `TESTING.md` - Test patterns and coverage
  - `CONCERNS.md` - Technical debt and known issues
  - `STACK.md` - Technology stack overview
  - `INTEGRATIONS.md` - External dependencies and APIs

## Key File Locations

**Entry Points:**
- `src/index.ts` - Core bundle export (~40 components)
- `src/index.all.ts` - Full bundle export (all 60+ components)
- `src/components/*/index.ts` - Individual component barrel exports

**Configuration:**
- `package.json` - Dependencies, version, export map, build scripts
- `vite.config.ts` - Build configuration, component discovery, plugins
- `vitest.config.ts` - Test runner configuration
- `tsconfig.json` - TypeScript compiler options
- `custom-elements-manifest.config.js` - Custom Elements Manifest generation

**Core Logic:**
- `src/components/*/component-name.ts` - Each component implementation
- `src/tokens/primitives.css.ts` - Base design tokens
- `src/tokens/semantic.css.ts` - Semantic token aliases
- `src/tokens/dark.css.ts` - Dark theme overrides
- `src/styles/reset.css.ts` - Global resets
- `src/utilities/form-actions.ts` - Form integration helpers
- `src/utilities/unique-id.ts` - ID generation

**Testing:**
- `test/setup.ts` - Vitest setup, DOM mocks, polyfills
- `test/helpers.ts` - Test utilities and custom element testing functions
- `test/components/*.test.ts` - Component unit tests
- `test/a11y.test.ts` - Accessibility audit tests

## Naming Conventions

**Files:**
- Component files: `kebab-case.ts` (e.g., `date-picker.ts`)
- Story files: `kebab-case.stories.ts` (e.g., `combobox.stories.ts`)
- Test files: `kebab-case.test.ts` (e.g., `button.test.ts`)
- Utilities: `kebab-case.ts` (e.g., `form-actions.ts`)
- Styles/tokens: `kebab-case.css.ts` (e.g., `semantic.css.ts`)

**Directories:**
- Component directories: `kebab-case/` (e.g., `src/components/button/`)
- Top-level: snake_case or dash-case (`.storybook`, `.changeset`, `src`, `test`, `dist`)

**Custom Elements:**
- Tag names: `am-<component>` (e.g., `<am-button>`, `<am-combobox>`)
- Class names: `Am<Component>` (e.g., `AmButton`, `AmCombobox`)
- Consistent namespace: all components prefixed with `am-`

**TypeScript/JavaScript:**
- Classes: `PascalCase` (e.g., `AmButton`, `AmCombobox`)
- Functions: `camelCase` (e.g., `uniqueId()`, `requestAssociatedFormSubmit()`)
- Constants: `UPPER_SNAKE_CASE` (rare in this codebase)
- Private members: `_camelCase` (e.g., `_internals`, `_focused`)
- Public properties: `camelCase` (e.g., `value`, `disabled`, `size`)

**CSS Custom Properties (Design Tokens):**
- Format: `--am-<category>-<name>` (e.g., `--am-color-primary`, `--am-spacing-md`)
- Categories: `color`, `spacing`, `radius`, `weight`, `size`
- Semantic variants: `--am-color-primary`, `--am-color-danger`, `--am-color-success`

**CSS Classes (Shadow DOM):**
- Format: lowercase hyphenated (e.g., `.loading-spinner`, `.focus-ring`, `.variant-outlined`)
- Generated by Lit's `classMap` directive based on component properties
- Rarely used directly; most styling via CSS custom properties

## Where to Add New Code

**New Feature/Component:**
1. Create directory: `src/components/new-component/`
2. Implement: `src/components/new-component/new-component.ts` (extend LitElement)
3. Export: `src/components/new-component/index.ts` (`export * from './new-component.js'`)
4. Test: `test/components/new-component.test.ts`
5. Document: `src/stories/new-component.stories.ts`
6. Export from appropriate entry point:
   - Core bundle: Add to `src/index.ts` (if essential)
   - Full bundle: Add to `src/index.all.ts` (always)

**New Utility Function:**
1. Add to: `src/utilities/[name].ts` (or create new file)
2. Export from: `src/index.ts` and/or `src/index.all.ts`
3. Test: `test/utilities/[name].test.ts` (if missing, create)

**New Style Utility:**
1. Add to: `src/styles/[name].css.ts` (or extend existing `src/styles/*.css.ts`)
2. Export from: `src/index.ts` (as CSS object for use in component templates)
3. Import in components via: `import { resetStyles } from '../../styles/reset.css.js'`

**New Design Token:**
1. Add to: `src/tokens/primitives.css.ts` (base) or `src/tokens/semantic.css.ts` (aliases)
2. For dark mode: Add override to `src/tokens/dark.css.ts`
3. Update export: `src/tokens/index.ts` (export token objects if needed)
4. Token is automatically available as CSS custom property in all components

**Modifying Existing Component:**
1. Edit: `src/components/[name]/[name].ts`
2. Update tests: `test/components/[name].test.ts`
3. Update stories: `src/stories/[name].stories.ts`
4. Update entry point if API changes (rarely needed — exports are stable)

## Special Directories

**`dist/` (Build Output):**
- Purpose: Published library files
- Generated: By `npm run build` (tsc + vite build + cem + build:tokens-css)
- Committed: Only after release (tracked by changesets workflow)
- Structure:
  - `amris.js` / `amris-core.js` - Entry point bundles
  - `components/*/index.js` - Component chunks (tree-shakeable)
  - `index.*.d.ts` - Type definitions
  - `custom-elements.json` - Component metadata
  - `styles/tokens.css` - Global stylesheet
  - `chunks/` - Code-split dependencies
  - `assets/` - CSS and other assets

**`coverage/` (Test Coverage):**
- Purpose: Code coverage reports (generated)
- Generated: By `npm run test:coverage` (vitest + c8)
- Committed: No (git-ignored)

**`.planning/codebase/` (Architecture Docs):**
- Purpose: Generated architecture and implementation guides
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, STACK.md, INTEGRATIONS.md
- Committed: Yes (reference for future work)
- Updated: By `/gsd-map-codebase` skill or manual edits

---

*Structure analysis: 2026-08-10*
