# Roadmap: Amris v1.0

## Overview

Amris v1.0 is a **brownfield hardening milestone** that takes an existing ~67-component Lit 3 / Web Components library to a frozen, dependable, published v1.0. Phases are workstreams, not vertical user slices, and they run in the research-convergent build order. First, stand up the test safety net and CI quality gates (branch/per-dir coverage, bundle-size, real-browser a11y) that guard every breaking change downstream. Then normalize the rough public API and commit a CEM baseline so the freeze can snapshot a consistent surface. Fix the known lifecycle leaks under one discipline. Add the three load-bearing v1.0 capabilities — list virtualization, validation-message display, and a keyboard-shortcut registry — behind a non-exported `src/internal/` boundary so the frozen surface stays small. Document the frozen contract. Finally, flip the surface-diff gate from report-only to enforcing and publish v1.0 to GitHub Packages on a green pipeline.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Test Coverage + CI Gates Foundation** - Close the test gap and stand up coverage/bundle-size/real-browser-a11y CI gates that guard all downstream breaking work (completed 2026-08-11)
- [x] **Phase 2: API Cleanup + CEM Baseline** - Normalize the public surface and commit a reviewable CEM baseline so the freeze can snapshot a consistent contract (completed 2026-08-17)
- [x] **Phase 3: Reliability & Leak Fixes** - Fix known timer/listener/focus/animation lifecycle leaks under one discipline, verified with teardown spies (completed 2026-08-17)
- [x] **Phase 4: Performance & Feature Capabilities** - Deliver virtualization, validation-message display, and the keyboard-shortcut registry on the `src/internal/` boundary (completed 2026-08-18)
- [x] **Phase 5: Documentation** - Document the frozen contract: peer-dep/browser floor, validation/theming/usage, and slot/part/token surface (completed 2026-08-19)
- [ ] **Phase 6: API Freeze + Release** - Flip the surface-diff gate to enforcing and publish v1.0 to GitHub Packages on a green pipeline

## Phase Details

### Phase 1: Test Coverage + CI Gates Foundation

**Goal**: Every component is guarded by tests and the CI pipeline blocks any merge that drops coverage, busts a bundle budget, or fails real-browser a11y — the safety net that makes the breaking API cleanup and feature work safe.
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, PERF-01
**Success Criteria** (what must be TRUE):

  1. Every component has a dedicated test file — the 20-component gap is closed (1:1 test-per-component).
  2. The four jsdom-unprovable areas are verified in a real browser via the minimal Vitest 4 Browser Mode + Playwright/Chromium lane: real `ElementInternals` form submission/validation participation, overlay focus trap + restoration, native `<dialog>`/top-layer, and floating-ui positioning.
  3. Global listener lifecycle and async/dynamic option updates are covered: teardown spies confirm attach-on-open / detach-on-close, and rapid combobox/select option updates keep the highlighted index clamped in bounds.
  4. CI fails when branch or per-directory coverage drops below threshold, and when any per-entry bundle (core/full/single-component, minified+gzipped) exceeds its `size-limit` budget or a tree-shaking regression is detected.
  5. axe a11y scans run in the real browser (color-contrast/region rules enabled) and gate CI.

**Plans**: 8/8 plans executed

- [x] 01-01-PLAN.md — Tracer: hybrid jsdom+Chromium Vitest projects, coverage/size/a11y gates, misc-display split, CI jobs — proven green end-to-end
- [x] 01-02-PLAN.md — Split layout-primitives into 5 dedicated 1:1 test files (stack, grid, surface, panel, card)
- [x] 01-03-PLAN.md — Split display-trivial (part A): app-shell, button-group, empty-state, error-text, field, hint-text, label, nav-bar
- [x] 01-04-PLAN.md — Split display-trivial (part B) + behavioral split-view + breadcrumb-item; progress-ring, side-nav, stat, status-dot, timeline, visually-hidden
- [x] 01-05-PLAN.md — Real-browser fidelity: overlay focus trap+restoration, native dialog/top-layer, floating-ui positioning
- [x] 01-06-PLAN.md — Real-browser form-association coverage for all form-associated controls (real ElementInternals/FormData)
- [x] 01-07-PLAN.md — jsdom async index-clamp (TEST-04) + global-listener teardown spies (TEST-05)
- [x] 01-08-PLAN.md — Finalize gates: full size-limit budget set + tree-shaking canary, coverage ratchet, retire last grouped file, prove pipeline green

### Phase 2: API Cleanup + CEM Baseline

**Goal**: The public surface is normalized dimension-by-dimension and captured in a committed, reviewable CEM baseline, so the v1.0 freeze can snapshot a consistent, diffable contract.
**Depends on**: Phase 1
**Requirements**: API-01, API-02, API-03, API-04, API-05
**Success Criteria** (what must be TRUE):

  1. A cross-component consistency audit exists as dimension matrices (per event, prop, boolean-naming, default, slot, part, and `--am-*` token) across all ~67 components.
  2. Inconsistencies the audit finds are normalized with breaking renames, each landed with its own Changeset.
  3. The four 600+ line components (combobox, select, date-picker, time-picker) are refactored into maintainable sub-units/controllers with the Phase 1 characterization tests still green.
  4. Slot names, `::part()` names, and `--am-*` tokens are enumerated and treated as frozen public surface.
  5. `api/custom-elements.baseline.json` is committed and a report-only surface diff runs in CI during cleanup.

**Plans**: 9/9 plans executed
**Wave 1**

- [x] 02-01-PLAN.md — Tracer: CEM baseline + report-only surface-diff comparator + comparator unit test + CI job (API-05)
- [x] 02-02-PLAN.md — Consistency audit: 7 dimension matrices + rename mapping + frozen-surface enumeration → api/AUDIT.md (API-01, API-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Rename wave A: overlay lifecycle events (am-show/am-hide → am-open/am-close) + Changeset + baseline (API-02)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Rename wave B: selection events (select → am-change, data-grid reconcile) + Changeset + baseline (API-02)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-05-PLAN.md — Rename wave C: D-03 full normalization (tabs change/toggle + prop/boolean outliers) + Changeset + baseline (API-02)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-06-PLAN.md — Refactor tracer: create 3 shared controllers in src/internal/ + wire combobox, behavior-preserving (API-03)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 02-07-PLAN.md — Refactor expansion: select + date-picker onto controllers + pure date-utils helper (API-03)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 02-08-PLAN.md — Refactor: time-picker pure time-utils helper (no floating-ui) (API-03)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 02-09-PLAN.md — Freeze slot/part/token surface + final baseline + phase gate (API-04, API-05)

### Phase 3: Reliability & Leak Fixes

**Goal**: The known lifecycle leaks are fixed under one shared discipline (gate on open/connected, mirror teardown in disconnect, guard focus with isConnected, centralize timers) and proven with teardown assertions — green before release, no user-visible regressions.
**Depends on**: Phase 1
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04
**Success Criteria** (what must be TRUE):

  1. The toast dismiss `setTimeout` is tracked and cleaned up via `_clearTimer()` — a toast removed before its timer fires leaves no pending callback.
  2. Global click/keydown listeners are gated on open state and torn down on disconnect across combobox, dropdown, context-menu, date-picker, popover, and tooltip, asserted with teardown spies.
  3. Focus restoration guards against removed/disconnected `_previouslyFocused` nodes via `isConnected` (dialog, drawer, command-palette, popover) — closing an overlay whose opener was removed does not throw.
  4. Dialog animation cleanup is hardened (explicit cleanup / `disconnectedCallback`) so animation listeners never dangle.

**Plans**: 4/4 plans complete

- [x] 03-04-PLAN.md

**Wave 1**

- [x] 03-01-PLAN.md — Tracer: TeardownScope shared discipline + toast dismiss-timer/animation-listener teardown (FIX-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Dialog isConnected focus guard + nudge-animation disconnectedCallback cleanup (FIX-03, FIX-04)
- [x] 03-03-PLAN.md — Drawer + command-palette isConnected focus guards, popover finding, FIX-02 teardown-spy verification (FIX-03, FIX-02)

### Phase 4: Performance & Feature Capabilities

**Goal**: The three load-bearing v1.0 capabilities — list virtualization, validation-message display, and a keyboard-shortcut registry — are delivered on the non-exported `src/internal/` boundary, so consumers gain the features while the frozen public surface stays small. Validation (#2) then registry (#3) add public surface and must land before freeze; virtualization (#1, highest a11y risk) is internal-only and freeze-neutral.
**Depends on**: Phase 1 (bundle-size gate), Phase 3 (amplifies the async-option / focus-restoration fixes)
**Requirements**: PERF-02, PERF-03, PERF-04, FEAT-01, FEAT-02, FEAT-03, FEAT-04
**Success Criteria** (what must be TRUE):

  1. `am-data-grid` virtualizes 1000+ rows and combobox/select option popups virtualize their lists — a11y-correct (`aria-setsize`/`aria-posinset`/`aria-rowcount`, `aria-activedescendant` scrolls the target into the window) with selection/sort/focus identity-keyed and form-value integrity preserved.
  2. floating-ui `autoUpdate` is gated to open transitions across all overlay components.
  3. Form controls auto-surface `ElementInternals.validationMessage` through `am-field`/`am-error-text` with same-shadow-root `aria-describedby`/`aria-invalid` and `:user-invalid` timing, plus a manual/server-error API (`setCustomError`) with defined precedence against `am-hint-text`/`am-error-text`.
  4. A keyboard-shortcut registry provides scopes, `mod`/`opt` platform normalization, conflict detection, and a reserved-combo blocklist (single keys remappable/disablable per WCAG 2.1.4).
  5. An `am-shortcuts` provider element (per-subtree via `@lit/context`) drives shortcuts, and `am-command-palette` is refactored off the hardcoded Cmd+K with graceful fallback when no provider is present.

**Plans**: 10/10 plans complete

**Wave 1**

- [x] 04-01-PLAN.md — Tracer: ValidationController + am-input end-to-end (same-root ARIA, setCustomError, D-01/D-04 timing) proven vs real ElementInternals (FEAT-01, FEAT-02)

**Wave 2** *(blocked on Wave 1)*

- [x] 04-02-PLAN.md — Validation: am-field D-02 hint↔error swap + text-input family (textarea, number-field, input-otp) (FEAT-01)
- [x] 04-03-PLAN.md — Validation: choice controls (checkbox, switch, radio, slider, color-picker) (FEAT-01, FEAT-02)
- [x] 04-04-PLAN.md — Validation: composite controls (select, combobox, rich-select, date-picker, time-picker) (FEAT-01, FEAT-02)
- [x] 04-05-PLAN.md — Registry core: ShortcutRegistry class (conflict/blocklist/scope/normalization) + jsdom tests (FEAT-03)

**Wave 3** *(blocked on Wave 2)*

- [x] 04-06-PLAN.md — am-shortcuts provider + @lit/context + command-palette D-09 refactor + browser composedPath test (FEAT-03, FEAT-04)
- [x] 04-07-PLAN.md — PERF-04: autoUpdate open-transition gating audit + popover migration + teardown-spy test (PERF-04)

**Wave 4** *(blocked on Wave 3)*

- [x] 04-08-PLAN.md — PERF-02: @lit-labs/virtualizer (external) + data-grid div-grid virtualization + browser test (PERF-02)

**Wave 5** *(blocked on Wave 4)*

- [x] 04-09-PLAN.md — PERF-03: combobox/select popup virtualization (option ids + aria-activedescendant + scroll-into-window) + browser test (PERF-03)

**Wave 6** *(blocked on Wave 5)*

- [x] 04-10-PLAN.md — Phase gate: CEM baseline + Changesets (setCustomError + am-shortcuts) + coverage re-baseline + green suite (FEAT-02, FEAT-04)

### Phase 5: Documentation

**Goal**: A consumer can read exactly what the frozen v1.0 contract is and how to use it — peer-dependency and browser floor, validation/theming/usage patterns, and the frozen slot/part/token surface.
**Depends on**: Phase 2 (frozen slot/part/token contract), Phase 4 (feature patterns to document)
**Requirements**: DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):

  1. README documents the Lit peer-dependency requirement and the Safari 16.4 browser floor (ElementInternals), including that form controls silently fail to submit below the floor.
  2. Validation, theming/token-contract, and usage docs exist — including the frozen slot/part/token contract a consumer can rely on.
  3. Storybook has runnable examples for the virtualization and validation-message patterns.

**Plans**: 4/4 plans executed

**Wave 1**

- [x] 05-01-PLAN.md — Tracer: contract-doc generator (CEM → docs/contract.md) + freeze-guarantee intro + build/CI drift check (DOCS-02)
- [x] 05-04-PLAN.md — Storybook pattern stories: patterns/validation + patterns/virtualization (interactive) (DOCS-03)

**Wave 2** *(blocked on 05-01)*

- [x] 05-02-PLAN.md — Prose docs: docs/theming.md + docs/validation.md + docs/usage.md (DOCS-02)

**Wave 3** *(blocked on 05-01, 05-02)*

- [x] 05-03-PLAN.md — README rebuild (consumer-first quick-start + browser floor) + vision relocation + docs/*.html retirement (DOCS-01)

### Phase 6: API Freeze + Release

**Goal**: v1.0 is frozen on an enforcing surface-diff gate and published to GitHub Packages on a fully green pipeline, with the publish artifact proven correct end to end.
**Depends on**: Phase 4 (all public-surface changes landed), Phase 5 (docs)
**Requirements**: SHIP-01, SHIP-02, SHIP-03, SHIP-04
**Success Criteria** (what must be TRUE):

  1. The CEM surface-diff gate is flipped from report-only to enforcing — CI fails on any public-surface change without an accompanying Changeset.
  2. `package.json` `exports` declares every deep entry including `styles/tokens.css`, `sideEffects` allowlists only element-registration + CSS modules, and Lit stays in `peerDependencies` (`^3.3.0`).
  3. A tarball-install smoke test passes: `npm pack`, install the tarball, and import full + per-component + `tokens.css` in both raw ESM and a bundler.
  4. The green-gated release pipeline (tests + coverage + a11y + bundle-size) publishes to GitHub Packages and tags **v1.0**.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6.
Phase 2 (API cleanup) and Phase 3 (leak fixes) both depend only on Phase 1 and may proceed in parallel; Phase 4 requires Phase 3 complete.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Test Coverage + CI Gates Foundation | 8/8 | Complete    | 2026-08-11 |
| 2. API Cleanup + CEM Baseline | 9/9 | Complete    | 2026-08-17 |
| 3. Reliability & Leak Fixes | 4/4 | Complete   | 2026-08-17 |
| 4. Performance & Feature Capabilities | 10/10 | Complete   | 2026-08-18 |
| 5. Documentation | 4/4 | Complete    | 2026-08-19 |
| 6. API Freeze + Release | 0/TBD | Not started | - |
