# Project Research Summary

**Project:** Amris (@willramanand/amris)
**Domain:** Framework-agnostic Lit 3 / Web Components UI library hardening to a frozen, published v1.0
**Researched:** 2026-08-10
**Confidence:** HIGH (features, architecture, pitfalls, most of stack); MEDIUM (CEM-diff tooling)

## Executive Summary

Amris is an existing ~67-component Lit 3 / Shadow-DOM web component library. This is a hardening milestone, not a greenfield build: the runtime stack is fixed and the job is to normalize a rough public API, close real test gaps, fix known leaks, add three consumer-facing features (validation-message display, keyboard-shortcut registry, list virtualization), stand up CI quality gates, and then freeze the v1.0 surface and publish. The single thing that must hold at 1.0 is a frozen, dependable public API backed by real test coverage.

All four research dimensions converge on the same build order, the most important output of this research: (1) tests + CI gates first, because they guard the breaking work that follows; (2) API cleanup + a committed Custom Elements Manifest (CEM) baseline, because the freeze can only snapshot a normalized surface; (3) leak/lifecycle bug fixes; (4) perf + the three features in parallel (they touch largely disjoint components); (5) API freeze; (6) release last. The load-bearing architectural move that makes this tractable is a new src/internal/ boundary: shared machinery for all three features lives there and is never re-exported, so it stays off the frozen public surface and can evolve after 1.0.

The dominant risk, raised independently by both Stack and Pitfalls research, is that jsdom cannot prove the milestone highest-value behaviors: ElementInternals/form participation, focus trap + restoration, real dialog/top-layer, floating-ui positioning, and virtualization scroll/focus are all currently mocked or absent. Tests go green against fakes while the real browser diverges. The research strongly recommends a minimal real-browser test lane (Vitest 4 Browser Mode + Playwright/Chromium) narrowly targeted at those four areas, but PROJECT.md currently lists automated non-jsdom infra as out-of-scope/deferred. This is a scope conflict the roadmap/requirements must explicitly resolve before planning the test and feature phases.

## Key Findings

### Recommended Stack

The runtime stack (TypeScript 6, Lit 3.3, Vite 8, Vitest 4, Storybook 10, floating-ui, Changesets, CEM analyzer) is already in place. Research recommends only additions/upgrades to reach a CI-gated v1.0, plus a deliberate do-not-over-tool-a-1.0 list (no @web/test-runner second runner, no visual-regression, no semantic-release, no app-level E2E). See STACK.md.

**Core additions:**
- **Vitest 4 Browser Mode + @vitest/browser-playwright + Playwright/Chromium** — real-browser fidelity for ElementInternals/focus/dialog/positioning/virtualization; reuses existing Vitest 4 infra with zero test-API rewrite (provider minor must track Vitest).
- **@vitest/coverage-v8 thresholds** (no new dep) — enable branch + per-directory coverage as a hard CI gate.
- **size-limit + @size-limit/preset-small-lib** — per-entry, gzipped, tree-shaking-aware bundle budgets that fail CI; must land before virtualization adds weight.
- **@wc-toolkit/changelog** — diffs custom-elements.json against a committed baseline to guard the element-level public surface (attrs/props/events/slots/parts/CSS vars). MEDIUM confidence — validate output on the Amris manifest before wiring the hard gate.
- **@axe-core/playwright** — runs axe in a real browser so color-contrast/region rules (currently disabled under jsdom) actually execute.
- **changesets/action@v1** (Changesets v2 compat) to GitHub Packages publish; pin to a commit SHA.
- **@microsoft/api-extractor** — OPTIONAL .d.ts guard; add only if TS types are a first-class contract.

### Expected Features

Table stakes for a credible 1.0 are largely already shipped; the gaps are the three target features plus accessibility hardening. See FEATURES.md.

**Must have (table stakes):**
- Accessibility baseline (focus-visible, focus trap, focus restoration, axe-clean) — the single biggest 1.0 credibility lever; gaps are focus-restoration and virtualized-list a11y.
- Frozen, documented public API + CEM manifest + design-token contract.
- Form participation via ElementInternals (shipped) — validation-message display is the missing piece.
- Tree-shakeable ESM per-component entries (shipped) + bundle-size CI gate.
- RTL audit via logical properties + :dir() (likely partial today).

**Should have (the three target features — all P1 by mandate):**
- **Validation-message display (#2)** — dual path: auto-surface ElementInternals.validationMessage + a manual/server-error API; am-field owns aria-describedby/aria-invalid; :user-invalid timing. Reuses shipped am-field/am-error-text/am-hint-text. **Complexity MEDIUM.** Cheapest/safest.
- **Keyboard-shortcut registry (#3)** — framework-agnostic registry with scopes, platform (mod/opt) normalization, conflict detection, reserved-combo blocklist, WCAG 2.1.4 compliance; am-command-palette refactored off hardcoded Cmd+K. **Complexity MEDIUM.** Smallest blast radius on frozen API; genuinely differentiating (no comparable WC library ships one).
- **List virtualization (#1)** — @lit-labs/virtualizer in am-data-grid + combobox/select popups, opt-in/threshold, with correct aria-setsize/aria-posinset/aria-activedescendant. **Complexity HIGH.** Schedule last with the most a11y buffer.

Recommended feature sequencing: **#2 then #3 then #1** (cheapest/safest first, riskiest a11y-heavy work last).

**Defer (v1.x / v2+):** editable/sortable virtualized-grid features, shortcut-config persistence (consumer-owned storage), framework wrapper packages, SSR/declarative shadow DOM, full spreadsheet data-grid. Explicit anti-features: auto-showing errors on first paint, keybindings that shadow browser/OS shortcuts, ElementInternals polyfill below Safari 16.4.

### Architecture Approach

Integration research, not redesign. The one structural move is a new src/internal/ layer holding the three features shared machinery (a VirtualListController, a validation-controller, and a ShortcutRegistry + @lit/context token), imported one-way by components and never re-exported, keeping it outside the frozen CEM/type surface. See ARCHITECTURE.md.

**Major components:**
1. **src/internal/ boundary** — cross-cutting; virtual-list, validation, and shortcut controllers live here so the 1.0 contract stays small and diffable.
2. **VirtualListController** (ReactiveController over @lit-labs/virtualizer) — scroller inside each component own shadow root (sidesteps lit/lit#3493); selection/sort/focus keyed by identity (getRowId), never by DOM position.
3. **validation-controller** — derives message per-instance from ElementInternals; message region renders in the same shadow root as the control (cross-root ARIA unavailable at Safari 16.4).
4. **ShortcutRegistry + am-shortcuts provider** — per-subtree instance via @lit/context (NOT a module singleton, which the architecture forbids); am-command-palette falls back to a local listener when no provider present.
5. **CEM baseline + CI diff** (api/custom-elements.baseline.json) — makes the frozen API a reviewable file; report-only during cleanup, enforcing at freeze.

### Critical Pitfalls

Top pitfalls from PITFALLS.md (10 total, mapped to phases):

1. **Freezing an inconsistent API** — audit dimension-by-dimension (a matrix per event/prop/slot/part/token across all 67 components), not component-by-component; the four 600+ line components hide the inconsistencies. Generate + diff the CEM in CI.
2. **Slots/parts/tokens treated as private** — slot names, part names, and --am-* custom properties are hard API in Shadow DOM; renaming them post-1.0 breaks consumers silently. Enumerate and freeze them in the CEM.
3. **Trusting jsdom** — no layout, focus, dialog top-layer, or native ElementInternals; focus/positioning/virtualization/form tests validate against fakes. Carve out a minimal real-browser lane (see scope conflict below).
4. **Gamed coverage gate** — render-only tests inflate line %; use branch + per-directory thresholds + a required-scenarios checklist + mutation spot-check on combobox/dialog/form base.
5. **Virtualization destroys a11y + form integrity** — model count/active/selected in state, set aria-setsize/aria-posinset/aria-rowcount, scroll active item into the window before moving focus, drive setFormValue from state not the option node.
6. **Keyboard registry fights browser/layout/focus** — reserved-combo blocklist, editable-context guard via composedPath(), conflict detection, WCAG 2.1.4 (single-key must be remappable/disablable).
7. **Validation-message desync/a11y** — drive from the same setValidity call, :user-invalid timing, aria-describedby + live region, define coexistence with am-error-text.
8. **Publish artifact breakage** — GitHub Packages does NOT support --provenance; sideEffects must allowlist only registration + CSS files; exports must declare every deep entry + tokens.css; Lit stays peerDependencies (^3.3.0). Add a tarball-install smoke test.
9. **Leak fixes patch symptoms, not the pattern** — one lifecycle discipline (gate listeners on open/connected, mirror teardown in disconnectedCallback, guard focus with isConnected, centralize timers); assert teardown with spies.
10. **Bundle-size monitoring that does not gate** — measure minified+gzipped core/full/single-component entries with hard fail thresholds + a tree-shaking assertion.

## Implications for Roadmap

All four research files converge on one build order. Suggested phases (aligned to PROJECT.md Active requirements and the Pitfalls phase labels):

### Phase 1: Test Coverage + CI Gates Foundation
**Rationale:** Characterization tests must precede the intentionally breaking API cleanup they guard; the bundle-size gate must exist before virtualization adds @lit-labs/virtualizer. Everything downstream depends on this.
**Delivers:** dedicated tests for the 20 untested components; the jsdom-vs-browser boundary decision + a minimal Vitest Browser Mode lane; branch + per-dir coverage gate; size-limit budget gate; report-only CEM diff.
**Addresses:** A11y baseline, bundle-size gate (FEATURES table stakes).
**Avoids:** Pitfalls 3 (jsdom blind spots), 4 (gamed coverage), 10 (non-gating size check).

### Phase 2: API Cleanup + CEM Baseline
**Rationale:** The freeze can only snapshot a normalized surface; refactor the four 600+ line components while characterization tests catch regressions.
**Delivers:** cross-dimension consistency matrices; prop/event/default normalization; refactored combobox/select/date-picker/time-picker; finalized exports map; committed api/custom-elements.baseline.json.
**Uses:** CEM analyzer + @wc-toolkit/changelog (report-only).
**Avoids:** Pitfalls 1 (inconsistent API), 2 (slots/parts/tokens as private).

### Phase 3: Bug / Leak Fixes
**Rationale:** Mostly internal, guarded by Phase 1 tests; not a freeze gate but must be green before release.
**Delivers:** shared lifecycle discipline — timer tracking, listener attach/detach gating, isConnected-guarded focus restoration, dialog animation cleanup; teardown assertions.
**Avoids:** Pitfall 9 (symptom-only leak fixes).

### Phase 4a: Perf — List Virtualization (parallel with 4b)
**Rationale:** Touches data-grid/combobox — disjoint from form controls; depends on the size gate (P1) and should follow the async-option / focus-restoration fixes (P3) it amplifies.
**Delivers:** VirtualListController in data-grid + combobox/select popups; floating-ui autoUpdate gated to open transitions; per-entry size snapshots.
**Implements:** src/internal/virtual-list.ts. **Designed to add no public API (freeze-neutral).**
**Avoids:** Pitfall 5 (virtualization a11y/form breakage).

### Phase 4b: Features — Validation Display + Keyboard Registry (parallel with 4a)
**Rationale:** Both add public surface, so must land before freeze; touch form controls + command-palette. Sequence validation (#2) before registry (#3).
**Delivers:** validation-controller wiring validationMessage + manual/server error API across form controls; ShortcutRegistry + am-shortcuts provider; command-palette refactored off hardcoded Cmd+K.
**Implements:** src/internal/validation-controller.ts, shortcut-registry.ts, shortcuts-context.ts.
**Avoids:** Pitfalls 6 (shortcut hazards), 7 (validation desync/a11y).

### Phase 5: Docs
**Rationale:** Documents the now-frozen contract; can overlap the tail of features.
**Delivers:** validation/theming/usage docs; README with Lit peer-dep + Safari 16.4 floor; token/part/slot contract.

### Phase 6: API Freeze + Release
**Rationale:** Freeze only after every public-surface change (cleanup + features) lands; release only on a green pipeline.
**Delivers:** flip CEM diff from report-only to enforcing; tarball-install smoke test (ESM + bundler, imports full + per-component + tokens.css); sideEffects/exports/peer-dep correctness; changesets/action@v1 to GitHub Packages; tag v1.0.
**Avoids:** Pitfall 8 (publish artifact breakage).

### Phase Ordering Rationale
- **Tests before cleanup** and **cleanup before freeze** are hard constraints from ARCHITECTURE.md build-order analysis.
- **Perf and features parallelize** because they touch disjoint component sets; both need the size gate from Phase 1.
- **Virtualization is freeze-neutral** (internal-only) so it can even land just after freeze if needed; validation + registry are not (they add slots/am-shortcuts/events) and must precede freeze.
- The grouping keeps all feature machinery behind src/internal/, preserving a small diffable frozen surface.

### Research Flags

Phases likely needing deeper research during planning (gsd-plan-phase --research-phase):
- **Phase 1:** the jsdom-vs-browser lane setup — Vitest 4 browser coverage instrumentation and provider version pinning need validation (STACK MEDIUM confidence).
- **Phase 4a (virtualization):** highest-complexity a11y (activedescendant + filtering + variable heights + mobile SR degradation); @lit-labs/virtualizer is pre-1.0.
- **Phase 6 (release):** confirm @wc-toolkit/changelog output on the Amris manifest before making it a hard gate (MEDIUM); GitHub Packages provenance/exports/sideEffects specifics.

Phases with standard, well-documented patterns (can skip research-phase):
- **Phase 2 (API cleanup):** CEM + consistency matrices are mechanical.
- **Phase 3 (leak fixes):** established lifecycle discipline.
- **Phase 4b validation display:** APIs (ElementInternals, aria-describedby) are well-documented; work is consistent wiring.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH / MEDIUM | Testing/coverage/size/release HIGH; CEM-diff tooling MEDIUM (newer package, validate on real manifest) |
| Features | HIGH | Patterns verified across Material Web, Spectrum, Web Awesome, WAI-ARIA APG |
| Architecture | HIGH | Grounded in the existing codebase; MEDIUM only on exact tool versions |
| Pitfalls | HIGH | Grounded in codebase CONCERNS + verified platform/tooling behavior |

**Overall confidence:** HIGH

### Gaps to Address

- **Real-browser test lane vs PROJECT.md scope (the key decision):** Stack and Pitfalls both argue a minimal Vitest Browser Mode + Playwright lane is a prerequisite to verify focus/virtualization/ElementInternals/positioning, yet PROJECT.md marks automated non-jsdom infra out-of-scope/deferred-to-v2. The roadmap/requirements must explicitly resolve this before Phase 1 — either narrow the exception (a browser lane scoped to only the four load-bearing areas) or accept those behaviors ship verified only by manual cross-browser testing. Recommendation: carve out the minimal lane; the three P1 features cannot be credibly frozen otherwise.
- **CEM-diff tool validation:** run @wc-toolkit/changelog against the actual custom-elements.json before wiring the hard gate; a small custom JSON comparator is the fallback.
- **Vitest 4 browser-mode coverage instrumentation:** may need @vitest/coverage-istanbul for the browser project only — validate during Phase 1 setup.
- **Validation UX policy:** hint-text vs error-text precedence (replace like Material, or stack?) and error-clearing behavior are undecided — settle during Phase 4b spec.
- **RTL audit scope:** current coverage likely partial; size the audit during planning.

## Sources

### Primary (HIGH confidence)
- Existing codebase maps (.planning/codebase/*, .planning/PROJECT.md) — architecture, concerns, testing state
- Vitest 4 Browser Mode + Playwright provider docs; WAI-ARIA APG Listbox pattern; Material Web / Spectrum Web Components validation docs; MDN ElementInternals; WebKit FACE support; TanStack Hotkeys; size-limit; Changesets action
- @lit-labs/virtualizer (directive/element, ResizeObserver, shadow-DOM caveat lit/lit#3493)
- WCAG 2.1.4; npm exports/sideEffects semantics; npm provenance = npmjs/Sigstore only

### Secondary (MEDIUM confidence)
- @wc-toolkit/changelog CEM-diff tooling (newer, validate on manifest)
- Web Awesome grid-virtualization-as-pro-feature; web-command-palette modifier notation
- Vitest 4 browser-mode V8 coverage compatibility

### Tertiary (LOW confidence)
- Command-palette UX convention writeups

---
*Research completed: 2026-08-10*
*Ready for roadmap: yes*
