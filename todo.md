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
- [x] Unit tests for component logic (properties, events, state) — 294 tests across 33 files
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
- [x] Create an installation / getting-started guide (`docs/getting-started.html`)
- [x] Set up a dedicated docs site with sidebar nav (`docs/` directory, served via Vite)
- [ ] Auto-generate API docs from JSDoc comments and Custom Elements Manifest
- [x] Document all CSS custom properties / design tokens (`docs/theming.html`)
- [x] Add usage examples for each component (`docs/components.html` — live demos for all 50+ components)
- [x] Add syntax highlighting to code examples (highlight.js)

### Accessibility
- [ ] Systematic WCAG 2.1 AA audit across all components
- [ ] Screen reader testing (NVDA, VoiceOver)
- [ ] Verify `prefers-reduced-motion` support across all animated components
- [x] Fix color contrast issues in light mode (tertiary text, danger color, badge tokens)
- [ ] Document keyboard interaction patterns for each component

### Project Hygiene
- [ ] Add a LICENSE file
- [ ] Add a CHANGELOG (or set up conventional commits + auto-changelog)
- [ ] Add a CONTRIBUTING guide
- [ ] Set up CI (lint, type-check, test on push/PR)
- [ ] Add visual regression tests (Playwright screenshots or Chromatic)

### Component Fixes
- [x] Badge: fix color contrast — use `--am-text` for all variants, add `--am-neutral-subtle` semantic token
- [x] Badge: removable badges self-remove on click (event still fires for listeners)
- [x] Accordion: remove border-bottom on last item (`:host(:last-of-type)`)
- [x] Toast: fix squished layout on mobile (`width: min(28rem, 100%)`, responsive region centering)
- [x] Toast: vertically center icon to first line of text
- [x] Toast region: `show()` appends to nearest theme provider instead of `document.body`
- [x] Drawer: fix full-height issue (`inset: auto` to reset UA dialog defaults)

## Nice-to-Have

- [ ] Framework wrapper packages (React, Vue, Angular)
- [ ] RTL layout support
- [ ] CDN distribution (unpkg / jsdelivr)
- [ ] Figma design token sync
- [ ] Density / compact mode
- [ ] Animation / motion presets library
- [ ] Tree-shaking verification and bundle size tracking
