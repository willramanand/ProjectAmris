# Requirements: Amris v1.0

**Defined:** 2026-08-10
**Core Value:** A frozen, dependable public API backed by real test coverage — consumers can drop `@willramanand/amris` into any app and trust it to be correct, accessible, and API-stable.

## v1 Requirements

Requirements for the v1.0 release. Each maps to a roadmap phase. Grounded in `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY) and `.planning/codebase/CONCERNS.md`.

### Testing & CI Gates

- [x] **TEST-01**: Every component has a dedicated test file (close the 20-component gap; 1:1 test-per-component)
- [x] **TEST-02**: Form-associated controls verified for real form submission and validation participation (real `ElementInternals`, not the jsdom mock)
- [x] **TEST-03**: Overlay focus trap and focus restoration verified (dialog, drawer, command-palette, popover)
- [x] **TEST-04**: Async/dynamic option updates verified — combobox/select rapid updates with highlighted index clamped in bounds
- [x] **TEST-05**: Global listener lifecycle verified with teardown spies (attach on open, detach on close/disconnect)
- [x] **TEST-06**: Minimal real-browser test lane (Vitest 4 Browser Mode + Playwright/Chromium) covering the 4 jsdom-unprovable areas: ElementInternals/form, focus trap+restoration, real `<dialog>`/top-layer, floating-ui positioning + virtualization scroll/focus
- [x] **TEST-07**: Branch + per-directory coverage threshold enforced as a CI gate (`@vitest/coverage-v8`)
- [x] **TEST-08**: axe a11y scans run in the real browser (color-contrast/region rules enabled) and gate CI (`@axe-core/playwright`)

### API Cleanup & Freeze

- [x] **API-01**: Cross-component consistency audit — dimension matrices per event, prop, boolean-naming, default, slot, part, and `--am-*` token across all ~67 components
- [x] **API-02**: Apply breaking normalization for inconsistencies the audit finds (prop/event/default renames), each with a Changeset
- [x] **API-03**: Refactor the four 600+ line components (combobox 741, select 718, date-picker 633, time-picker 627) into maintainable sub-units/controllers
- [x] **API-04**: Slot names, `::part()` names, and `--am-*` tokens enumerated and treated as frozen public surface
- [x] **API-05**: Committed CEM baseline `api/custom-elements.baseline.json` with report-only surface diff during cleanup

### Reliability & Leak Fixes

- [x] **FIX-01**: Toast dismiss `setTimeout` tracked and cleaned up via `_clearTimer()`
- [x] **FIX-02**: Global click/keydown listeners gated on open state and torn down on disconnect (combobox, dropdown, context-menu, date-picker, popover, tooltip)
- [x] **FIX-03**: Focus restoration guards against removed/disconnected `_previouslyFocused` nodes via `isConnected` (dialog, drawer, command-palette, popover)
- [x] **FIX-04**: Dialog animation cleanup hardened (explicit cleanup / `disconnectedCallback`)

### Performance & Bundle

- [x] **PERF-01**: Bundle-size budgets enforced in CI — `size-limit`, minified+gzipped, per-entry (core/full/single-component), with a tree-shaking assertion that fails on regression
- [ ] **PERF-02**: List virtualization for `am-data-grid` (1000+ rows) via `@lit-labs/virtualizer`, opt-in/threshold, a11y-correct (`aria-setsize`/`aria-posinset`/`aria-rowcount`), selection/sort/focus identity-keyed
- [ ] **PERF-03**: List virtualization for combobox/select option popups, a11y-correct (`aria-activedescendant` scrolls target into window), form-value integrity preserved
- [ ] **PERF-04**: floating-ui `autoUpdate` gated to open transitions across all overlay components

### Features (new v1.0 capabilities)

- [ ] **FEAT-01**: Form controls auto-surface `ElementInternals.validationMessage` through `am-field`/`am-error-text` with same-shadow-root `aria-describedby`/`aria-invalid` and `:user-invalid` timing
- [ ] **FEAT-02**: Manual/server validation error API (e.g. `setCustomError`) for consumer-supplied messages, with defined precedence against `am-hint-text`/`am-error-text`
- [ ] **FEAT-03**: Keyboard-shortcut registry with scopes, `mod`/`opt` platform normalization, conflict detection, and a reserved-combo blocklist (WCAG 2.1.4 — single keys remappable/disablable)
- [ ] **FEAT-04**: `am-shortcuts` provider element (per-subtree via `@lit/context`); `am-command-palette` refactored off hardcoded Cmd+K with graceful fallback when no provider is present

### Documentation

- [ ] **DOCS-01**: README documents the Lit peer-dependency requirement and the Safari 16.4 browser floor (ElementInternals)
- [ ] **DOCS-02**: Validation, theming/token contract, and usage docs — including the frozen slot/part/token contract
- [ ] **DOCS-03**: Storybook examples for virtualization and validation-message patterns

### Release & Publish

- [ ] **SHIP-01**: CEM surface diff gate flipped from report-only to enforcing at freeze (`@wc-toolkit/changelog`, or a small JSON comparator fallback)
- [ ] **SHIP-02**: `package.json` `exports` declares every deep entry incl. `styles/tokens.css`; `sideEffects` allowlists element-registration + CSS modules; Lit stays in `peerDependencies` (`^3.3.0`)
- [ ] **SHIP-03**: Tarball-install smoke test — `npm pack` → install the tarball, import full + per-component + `tokens.css` in both ESM and a bundler
- [ ] **SHIP-04**: Green-gated release pipeline (`changesets/action@v1`, pinned to a commit SHA) publishes to GitHub Packages and tags **v1.0**

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Testing

- **TEST-V2-01**: WebKit (Safari 16.4) real-browser lane to exercise the documented ElementInternals floor
- **TEST-V2-02**: `@microsoft/api-extractor` `.d.ts` surface guard (if TypeScript types become a first-class contract)

### Accessibility & Internationalization

- **RTL-V2-01**: Full RTL audit and fixes across floating-ui overlays (logical properties + `:dir()`) — sized during planning; partial today

### Features

- **FEAT-V2-01**: Shortcut-config persistence (consumer-owned storage)
- **FEAT-V2-02**: Editable/sortable virtualized data-grid features (full spreadsheet grid)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New components beyond ~67 | Feature freeze — 1.0 hardens what exists, prevents sprawl |
| Framework wrapper packages (React/Vue/Angular) | Custom elements already interop; wrappers are post-1.0 |
| SSR / declarative shadow DOM | Vite 8 targets client ESM; not a 1.0 goal |
| Full multi-engine real-browser test matrix | Minimal Chromium lane covers the 4 load-bearing areas; full matrix = over-tooling a 1.0 |
| Auto-showing validation errors on first paint | Anti-feature — errors show after interaction (`:user-invalid`), not before |
| Keybindings that shadow browser/OS shortcuts | Anti-feature — reserved-combo blocklist prevents it |
| ElementInternals polyfill below Safari 16.4 | Not polyfillable; browser floor documented instead |
| Figma sync, CLI tooling | Outside the library's 1.0 remit |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 1 | Complete |
| TEST-04 | Phase 1 | Complete |
| TEST-05 | Phase 1 | Complete |
| TEST-06 | Phase 1 | Complete |
| TEST-07 | Phase 1 | Complete |
| TEST-08 | Phase 1 | Complete |
| PERF-01 | Phase 1 | Complete |
| API-01 | Phase 2 | Complete |
| API-02 | Phase 2 | Complete |
| API-03 | Phase 2 | Complete |
| API-04 | Phase 2 | Complete |
| API-05 | Phase 2 | Complete |
| FIX-01 | Phase 3 | Complete |
| FIX-02 | Phase 3 | Complete |
| FIX-03 | Phase 3 | Complete |
| FIX-04 | Phase 3 | Complete |
| PERF-02 | Phase 4 | Pending |
| PERF-03 | Phase 4 | Pending |
| PERF-04 | Phase 4 | Pending |
| FEAT-01 | Phase 4 | Pending |
| FEAT-02 | Phase 4 | Pending |
| FEAT-03 | Phase 4 | Pending |
| FEAT-04 | Phase 4 | Pending |
| DOCS-01 | Phase 5 | Pending |
| DOCS-02 | Phase 5 | Pending |
| DOCS-03 | Phase 5 | Pending |
| SHIP-01 | Phase 6 | Pending |
| SHIP-02 | Phase 6 | Pending |
| SHIP-03 | Phase 6 | Pending |
| SHIP-04 | Phase 6 | Pending |

**Coverage:**

- v1 requirements: 32 total (8 TEST + 5 API + 4 FIX + 4 PERF + 4 FEAT + 3 DOCS + 4 SHIP)
- Mapped to phases: 32 ✓
- Unmapped: 0

> Note: an earlier draft of this file stated "27 total"; the actual count of distinct requirement IDs is 32. Counter corrected during roadmap creation.

---
*Requirements defined: 2026-08-10*
*Last updated: 2026-08-10 after roadmap creation (traceability populated, 32/32 mapped)*
