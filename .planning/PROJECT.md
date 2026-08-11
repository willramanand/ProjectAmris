# Amris

## What This Is

Amris is a framework-agnostic UI component library built on Lit 3 and Web Components. It ships 60+ Shadow-DOM-encapsulated custom elements (buttons, forms, overlays, navigation, data display) with a `--am-*` design-token system and light/dark theming, usable in plain HTML or any framework (React, Vue, Angular, Svelte). This milestone hardens the existing library into a frozen, production-ready **v1.0** published to GitHub Packages.

## Core Value

Consumers can drop `@willramanand/amris` into any app and trust the components to be correct, accessible, and API-stable — so the ONE thing that must hold at 1.0 is a **frozen, dependable public API backed by real test coverage**.

## Business Context

<!-- OPTIONAL — retained: this is a published, consumer-facing package. -->

- **Customer**: App developers who install `@willramanand/amris` from GitHub Packages
- **Revenue model**: Not monetized — open component library under the maintainer's scope
- **Success metric**: v1.0 tagged and published with CI quality gates green; zero known P0/P1 defects
- **Strategy notes**: —

## Requirements

### Validated

<!-- Inferred from existing codebase (see .planning/codebase/). Shipped and relied upon. -->

- ✓ 60+ Lit web components across foundation, layout, form, navigation, feedback, data-display, and overlay categories — existing
- ✓ Framework-agnostic custom elements usable in HTML/React/Vue/Angular/Svelte — existing
- ✓ Shadow DOM style encapsulation per component — existing
- ✓ Design-token system (`--am-*` primitives, semantic aliases, dark overrides) — existing
- ✓ Light/dark theming via `<am-theme-provider>` and `dist/styles/tokens.css` — existing
- ✓ Form-associated controls via ElementInternals (`setFormValue`, `setValidity`) — existing
- ✓ Floating-UI auto-positioning for overlays (dialog, tooltip, popover, dropdown, menu) — existing
- ✓ Tree-shakeable ESM bundles: core, full, and per-component entry points — existing
- ✓ Storybook 10 component docs and visual development — existing
- ✓ Vitest + jsdom test harness with axe-core a11y scans — existing
- ✓ Published to GitHub Packages as `@willramanand/amris`; Changesets versioning — existing

### Active

<!-- v1.0 hardening scope. Hypotheses until shipped and validated. -->

- [ ] API audit: identify rough/inconsistent public APIs (prop names, event names, defaults); apply breaking cleanup, then freeze the v1.0 surface
- [ ] Test coverage: add dedicated tests for the 20 untested components; close form-integration, focus-trap, listener-lifecycle, and async-update gaps
- [ ] Enforce a coverage threshold as a CI gate before publish
- [ ] Bug/leak fixes: track toast dismiss `setTimeout`; gate global listener attach/detach on open state; guard focus restoration against removed nodes; harden dialog animation cleanup
- [ ] Performance: implement list virtualization for DataGrid/combobox (1000+ rows); gate floating-ui `autoUpdate` to open transitions; add bundle-size monitoring in CI
- [ ] Feature: form controls display `ElementInternals.validationMessage`
- [ ] Feature: global keyboard-shortcut registry (replace hardcoded Cmd+K in command-palette)
- [ ] Docs: validation/theming/usage docs, README with Lit peer-dependency and browser-support requirements
- [ ] Release: green CI release pipeline (tests + coverage + a11y + bundle-size), then tag and publish **v1.0**

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- New components beyond the current ~67 — feature freeze; 1.0 hardens what exists, prevents sprawl
- Framework-specific wrapper packages (React/Vue/Angular bindings) — custom elements already interop; wrappers are a post-1.0 concern
- SSR / server rendering support — Vite 8 build targets client ESM; not a 1.0 goal
- Automated real-browser (non-jsdom) test infrastructure — covered by manual cross-browser testing per BROWSER_SUPPORT.md; deferred to v2 (LOW priority in CONCERNS)
- Figma sync, CLI tooling, design-tool integrations — out of the library's 1.0 remit

## Context

- Brownfield: full codebase map exists at `.planning/codebase/` (ARCHITECTURE, STACK, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS), analyzed 2026-08-10
- Stack: TypeScript 6.0.3 (strict), Lit 3.3.2 (peer dep), Vite 8, Vitest 4, Storybook 10, `@floating-ui/dom` 1.7.6, Changesets; Node 20; ESM-only
- Prior review closed 2026-04-25 fixed all noted P0/P1 issues (`fixes.md`); floating-ui update gating audited then
- Known tech debt: four components exceed 600 lines (combobox 741, select 718, date-picker 633, time-picker 627) — refactor candidates during API cleanup
- Browser floor: Safari 16.4 (first ElementInternals release); form controls silently fail to submit below floor
- Test state: 46 test files for ~66 components; 20 components have no dedicated tests; no coverage threshold enforced; no bundle-size monitoring in CI

## Constraints

- **Tech stack**: Lit 3 + Web Components, Shadow DOM, ESM-only — architectural foundation; do not introduce global CSS or CommonJS
- **Compatibility**: Peer dependency on Lit 3.3.2+; consumers provide Lit — must not bundle it
- **Compatibility**: ElementInternals is not polyfillable; browser floor stays Safari 16.4 — document, do not work around
- **Theming**: All component styling via `--am-*` semantic tokens — no hardcoded colors (breaks dark mode)
- **Security**: Lit-safe templating only — no `innerHTML`/`eval`; keep the property→event, no-global-state model
- **Dependencies**: TypeScript 6.0.3 is very recent — pin to latest stable 5.x if instability surfaces

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ship a frozen v1.0 (not just quality bar) | Consumers need an API-stable, dependable release | — Pending |
| Allow breaking API changes before the freeze | Last chance to fix rough/inconsistent APIs before locking the contract | — Pending |
| Include validation messages, list virtualization, and keyboard-shortcut registry in 1.0 | The three CONCERNS "missing critical features" are load-bearing for real consumers | — Pending |
| Enforce coverage + bundle-size + a11y gates in CI | Automate the confidence needed to freeze and publish | — Pending |
| Feature-freeze the component set at ~67 | Prevent sprawl; 1.0 hardens existing surface | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-10 after initialization*
