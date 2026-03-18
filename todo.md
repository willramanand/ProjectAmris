# Amris — Production Readiness TODO

## Must-Do Before Use

### Build Output
- [x] Set `declaration: true` and `declarationMap: true` in `tsconfig.json`
- [x] Configure `outDir` for compiled output
- [x] Remove `noEmit: true` from tsconfig (or add a separate tsconfig for declaration generation)
- [x] Verify `.d.ts` files are generated in `dist/`
- [x] Add source maps to build output

### Package Configuration
- [ ] Set a real version (e.g. `"0.1.0"`)
- [x] Add `"module"` field pointing to ESM entry
- [x] Add `"types"` field pointing to generated declarations
- [x] Add `"exports"` map for modern resolution
- [x] Add `"files"` whitelist for npm publishing
- [ ] Add `"license"`, `"repository"`, `"keywords"` fields

### Testing
- [x] Set up test runner (Vitest + happy-dom)
- [x] Unit tests for component logic (properties, events, state) — 259 tests across 32 files
- [x] Keyboard interaction tests for form inputs, selects, dropdowns, dialogs
- [x] Basic a11y smoke tests with axe-core — 35 tests across all components
- [x] Form association tests (ElementInternals, form submission)
- [x] Add test script to `package.json`
- [x] Code coverage at 95%+ lines (via @vitest/coverage-v8)

### Custom Elements Manifest
- [x] Configure and run `custom-elements-manifest` analyzer (package already installed)
- [x] Add `"customElements"` field to `package.json` pointing to the manifest
- [x] Add manifest generation to the build script

## Should-Do Soon

### Documentation
- [ ] Create an installation / getting-started guide
- [ ] Set up Storybook or a dedicated docs site
- [ ] Auto-generate API docs from JSDoc comments and Custom Elements Manifest
- [ ] Document all CSS custom properties / design tokens
- [ ] Add usage examples for each component

### Accessibility
- [ ] Systematic WCAG 2.1 AA audit across all components
- [ ] Screen reader testing (NVDA, VoiceOver)
- [ ] Verify `prefers-reduced-motion` support across all animated components
- [ ] Verify color contrast in both light and dark themes
- [ ] Document keyboard interaction patterns for each component

### Project Hygiene
- [ ] Add a LICENSE file
- [ ] Add a CHANGELOG (or set up conventional commits + auto-changelog)
- [ ] Add a CONTRIBUTING guide
- [ ] Set up CI (lint, type-check, test on push/PR)
- [ ] Add visual regression tests (Playwright screenshots or Chromatic)

## Nice-to-Have

- [ ] Framework wrapper packages (React, Vue, Angular)
- [ ] RTL layout support
- [ ] CDN distribution (unpkg / jsdelivr)
- [ ] Figma design token sync
- [ ] Density / compact mode
- [ ] Animation / motion presets library
- [ ] Tree-shaking verification and bundle size tracking
