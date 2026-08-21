# Project Research Summary

**Project:** Amris (`@willramanand/amris`)
**Domain:** Performance / bundle-size / cross-engine hardening of a frozen-API Lit 3 Web Components library (v1.1) for low-end enterprise devices and slow networks
**Researched:** 2026-08-20
**Confidence:** HIGH

## Executive Summary

Amris v1.1 is an optimization-and-compatibility milestone, not a feature milestone: a shipped, FROZEN-API Lit 3 / Web Components library gets faster, smaller, and reaches further down the browser stack, with every change provably behavior- and surface-preserving against the v1.0 CEM (the surface-diff gate is the guardrail). All four research tracks converge on one method experts use for exactly this problem: **measure first** (real-browser, CPU/network-throttled baselines plus committed budgets), then cut, then gate. The decisive structural fact is that the existing `src/internal/` boundary already funnels every cross-cutting concern through a *single* chokepoint file per concern, so the highest-value work (deferring `@floating-ui/dom`, deferring the virtualizer, capability-gating forms) is a handful of internal single-file edits that never touch the frozen public surface, rather than N component rewrites.

The recommended approach adds **zero consumer-facing runtime dependencies** and reuses the four existing CI gates. Bundle attribution comes from `rollup-plugin-visualizer` plus `@size-limit/esbuild-why` (dev-only); cross-engine coverage comes from adding WebKit/Firefox instances to the existing Vitest Browser Mode lane; throttled runtime perf comes from a small in-repo Playwright CDP harness emitting a JSON baseline diffed like the proven `cem-diff.mjs` pattern. The single biggest, lowest-risk win is converting the static `@floating-ui/dom` import in `src/internal/controllers/floating-position.ts` into a memoized dynamic `import()`, one file that fans out to all 6 overlays, removing positioning math from every non-overlay page.

The risks are almost entirely *silent* ones the shape-only surface-diff gate does NOT catch, and they must be carried into the roadmap as dedicated guards. The top five: (a) `.size-limit.json` currently ignores both `lit` and `@floating-ui/dom`, so the deferral win, and any accidental Lit-bundling, is *invisible* to the existing gate; (b) narrowing `sideEffects` to shake harder can tree-shake away `@customElement` registration, shipping unstyled unknown elements with a green CEM; (c) ElementInternals is not one capability but several (form-association vs ARIA reflection landed at different engine versions), so a single feature probe causes silent a11y regressions; (d) virtualization tuning can break `aria-setsize` / selection identity / `setFormValue`, a frozen-behavior violation axe cannot see; and (e) perf gates must enforce stable *count* metrics (render/update/`computePosition` calls) and keep wall-clock report-only, or flaky red builds block the release pipeline.

## Key Findings

### Recommended Stack

Add four small, **dev-only** tools and reuse three existing lanes; do NOT add a perf framework or a second browser-test toolchain. Cross-engine coverage is achieved by adding `firefox` plus `webkit` instances to the existing Vitest Browser Mode lane (only `npx playwright install firefox webkit` in CI); throttled runtime perf is a small in-repo CDP harness (`Emulation.setCPUThrottlingRate`, `Network.emulateNetworkConditions`, `Performance.getMetrics`) on the existing Playwright/Chromium lane, gated by a baseline-diff script mirroring `scripts/cem-diff.mjs`. Feature detection needs **no tooling**: plain TS guards on the non-exported `src/internal/` boundary. CDP throttling is Chromium-only, so WebKit/Firefox stay correctness-only; document that split.

**Core technologies (all devDependencies):**
- `rollup-plugin-visualizer@7.0.1`: per-entry payload attribution (treemap, gzip+brotli), native to the existing Vite/Rollup build; local report, never ships.
- `@size-limit/esbuild-why@13`: adds `--why` breach diagnosis to the EXISTING size-limit gate, reuses the gate already blocking CI (must match size-limit major 13).
- `tachometer@0.7.2`: statistically-rigorous browser A/B micro-benchmark for heavy components (data-grid, combobox, overlays), the Lit team own tool; local-first, optional CI.
- Vitest Browser `instances` (firefox/webkit) plus Playwright CDP harness: engine-widening and throttled metrics on the lane already invested in.

### Expected Features

Features here are optimization/compatibility *behaviors*, not new components or API. Every deliverable is flagged **[SP]** surface-preserving or **[CS]** needs-Changeset. **Settled fact confirmed by all four tracks:** `highlight.js` is NOT imported anywhere in `src/`; it is a Storybook/docs devDependency and is already absent from every shipped chunk. Do not spend any phase deferring highlight.js; the real shipped heavy deps are `@floating-ui/dom` and `@lit-labs/virtualizer`. (The correct, optional highlight.js action is a one-line move to `devDependencies` if it is not already.)

**Must have (table stakes; the milestone claim depends on these, all [SP]):**
- Reproducible size plus throttled runtime-perf baseline harness plus a low-end target profile chosen from that data; everything downstream depends on it.
- Per-entry **brotli** (on-the-wire) budgets, report-only CI gate first.
- `@floating-ui/dom` deferred to overlay-open via memoized dynamic `import()` in `floating-position.ts`; largest verified size lever for non-overlay pages.
- ElementInternals feature-detect so the constructor no longer throws below Safari 16.4 (element still renders and emits events).
- Behavior-preserving runtime-perf pass on the flagged hotspots (data-grid re-render-on-sort, combobox filter-per-keystroke, overlay reposition).
- Documented true browser floor plus degradation matrix; widened tested-engine lane (WebKit/Firefox/Chromium) on the load-bearing tests.
- Budget gates flipped report-only to enforcing as the finish line.

**Should have (differentiators):** brotli-on-the-wire budgets, a named low-end profile from real data, idle/deferred non-critical init, per-component cost cards in docs.

**Defer / conditional:**
- Hidden-input Light-DOM form-participation fallback below the floor: the one **[CS]-lite** item; additive/opt-in, add only if enterprise demand justifies a Changeset (see conflict resolution below).
- SSR / declarative shadow DOM and framework wrappers: out of scope for v1.1.

**Anti-features (explicitly rejected):** hard ElementInternals polyfill, consumer-facing lazy-load as public API, restructuring `--am-*` token names, bundling Lit, chasing IE11, full every-component by every-engine matrix.

### Architecture Approach

All v1.1 machinery lands in the non-exported `src/internal/` boundary, invisible to the CEM by construction. New internal modules: `capabilities.ts` (memoized feature detection), `lazy-load.ts` (promise-memoized dynamic imports), `form-participation.ts` (ElementInternals-or-hidden-input seam); new build scripts `perf-harness.mjs` / `size-baseline.mjs`. The load-bearing insight is one chokepoint per concern, so deferral and form-fallback are mostly single-file internal edits.

**Major components / chokepoints:**
1. `src/internal/controllers/floating-position.ts` (MODIFIED): awaits `lazy-load` before first `computePosition`; fans out to all 6 overlays.
2. `src/internal/helpers/virtualize-support.ts` (MODIFIED): dynamic-imports the virtualizer at/above `VIRTUALIZE_ROW_THRESHOLD`; fans out to data-grid plus combobox/select popups.
3. `src/internal/helpers/form-participation.ts` (NEW) plus `capabilities.ts` (NEW): shared seam for ~14 form controls; ElementInternals when present, else a hidden light-DOM `<input>`.
4. Build/CI: `perf-harness.mjs`, `size-baseline.mjs`, extended `.size-limit.json`, WebKit/Firefox Vitest instances; measurement/gates, not shipped.

### Critical Pitfalls

1. **Size gate blind to the win**: `.size-limit.json` ignores `@floating-ui/dom`, so deferral shows near-zero change and accidental Lit-bundling is hidden. Fix: keep `lit` ignored (peer dep) but add a dedicated delivered-payload metric that COUNTS floating-ui, plus an explicit no-bundled-Lit grep assertion independent of size-limit.
2. **`sideEffects` tree-shakes away registration** (FREEZE-VIOLATION): `@customElement` is a side effect; over-narrowing ships unstyled unknown elements with a green CEM. Extend the tree-shaking canary to assert the imported component still `customElements.define`s at runtime.
3. **ElementInternals detected as one atomic capability** (A11Y-REGRESSION): FACE, ARIA state reflection, and id-ref ARIA reflection shipped on different engine dates. Probe each sub-capability independently; document the true per-capability floor, not one blanket Safari 16.4.
4. **Virtualization tuning breaks AT set-size / selection / `setFormValue`** (A11Y plus FREEZE): author `aria-setsize` / `aria-rowcount` from full data length, key selection on stable data ids (never DOM node identity), assert selection plus form value survive a scroll that unmounts the selected row.
5. **Flaky perf gate flipped too early**: gate on stable COUNT metrics (render/update/`computePosition` calls, node counts); keep wall-clock report-only with a wide band; characterize the noise floor before enforcing; keep the flip off the release critical path.

Plus: deferred-overlay 0,0/focus race (prefetch on trigger intent, reveal after first position); hidden-input double-submit (gate strictly on absent `setFormValue`, one channel XOR the other); `:has()` / `adoptedStyleSheets` silent CSS failure on old engines (true floor = max of JS-API floor and CSS-feature floor, test visually).

## Implications for Roadmap

Ordering rule from the research (and PROJECT.md): **measure before optimize; degradation guards before cross-engine test; enforce gates last.**

### Phase 1: Measurement Harness plus Baselines plus Budgets
**Rationale:** Nothing can be optimized, and no budget defended, without repeatable throttled before/after numbers; this de-risks every later cut and picks the low-end profile from real data.
**Delivers:** `perf-harness.mjs` on the Vitest browser lane (CDP CPU/network throttle, COUNT plus wall-clock metrics), `size-baseline.mjs`, re-scoped `.size-limit.json` (brotli, a metric that COUNTS floating-ui, marginal-cost plus first-load metrics), committed baselines, report-only gates.
**Addresses:** baseline harness, per-entry brotli budgets, low-end target profile, dependency-graph audit (confirm highlight.js absent from `dist`).
**Avoids:** Pitfalls 1, 2, 7, 15 (seeds noise characterization).

### Phase 2: Capabilities Module (feature-detection infrastructure)
**Rationale:** Guards must exist before any degradation or CSS-payload audit depends on them (guards before cross-engine test); pure infrastructure, no behavior change.
**Delivers:** `src/internal/helpers/capabilities.ts` with independently-probed, memoized booleans (ElementInternals FACE vs ARIA reflection, `adoptedStyleSheets`, `:has()`) plus jsdom capability-off tests.
**Implements:** `capabilities.ts` chokepoint. **Avoids:** Pitfall 9 (per-capability probing).

### Phase 3: Bundle-Size Deferral
**Rationale:** Largest verified size lever; depends on Phase 1 to prove the byte win and Phase 2 `lazy-load` companion.
**Delivers:** `lazy-load.ts` (NEW), `floating-position.ts` to deferred memoized import, `virtualize-support.ts` threshold-gated virtualizer import; shared-chunk dedupe plus deep-import purity verified; no-bundled-Lit plus registration-smoke assertions.
**Uses:** visualizer plus `esbuild-why`. **Avoids:** Pitfalls 3, 4, 5, 6.

### Phase 4: Runtime-Perf Tuning (heaviest components)
**Rationale:** Only tune what the Phase 1 profile flags, and measure against the post-deferral graph.
**Delivers:** behavior-preserving narrowing on data-grid (re-render-on-sort), combobox (filter-per-keystroke), overlay reposition, each re-measured; accessible-name/role snapshots as freeze guards.
**Avoids:** Pitfalls 8, 13, 14.

### Phase 5: Graceful Degradation plus Compat Matrix
**Rationale:** Degradation must be built before it can be tested on widened engines.
**Delivers:** `form-participation.ts` seam routing ~14 controls (ElementInternals or hidden-input fallback), CSS `:has()` / container-query audit, WebKit/Firefox added to the load-bearing lane, documented true per-capability browser floor plus degradation matrix (BROWSER_SUPPORT.md).
**Addresses:** feature-detect (no constructor throw), degradation matrix, widened engine lane. **Avoids:** Pitfalls 9, 10, 11, 12.

### Phase 6: Flip Gates to Enforcing
**Rationale:** Lock in results last, after baselines are trustworthy and gains banked; enforcing before stability produces false failures.
**Delivers:** size gates enforcing first (stable), then runtime COUNT gates, wall-clock report-only; thresholds outside the measured noise floor; flip kept off the release critical path during soak.
**Avoids:** Pitfall 15.

### Phase Ordering Rationale
- Harness is the universal prerequisite (budgets, profile, deferral proof, tuning targets all need before/after numbers).
- Capabilities module precedes both the size CSS-audit and the form fallback that consume it.
- Deferral before runtime tuning so tuning measures the real post-deferral graph.
- Degradation built before the widened-engine matrix that validates it; enforcing gates last so they lock results rather than block in-progress work.

### Conflict Resolution: below-floor form fallback
Architecture calls the `form-participation.ts` seam surface-preserving; Features flags the hidden-input fallback as needing a Changeset. **Resolution:** the Tier-1 feature-detect guard (no constructor throw; internals used only when present) is surface-preserving **table-stakes** and belongs in Phase 5. The Tier-2 hidden-input Light-DOM fallback is **additive/opt-in and the one item that may warrant a Changeset** (Light-DOM name/value is arguably observable), so hold it as optional, gated strictly on absent `setFormValue`, pending an enterprise-demand decision. Do not ship Tier-2 by default.

### Research Flags
Phases likely needing deeper `--research-phase` work during planning:
- **Phase 1:** perf-gate noise characterization and whether CI run-to-run variance lets the gate enforce, or needs a dedicated/manual-dispatch low-noise runner.
- **Phase 5:** true per-capability browser floor (FACE vs ARIA reflection vs `:has()` / `adoptedStyleSheets`) is resolved empirically on the widened matrix; the Tier-2 fallback Changeset decision.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 2 / Phase 3:** memoized dynamic-import plus feature-detection are established Lit/Web-Component patterns with in-repo chokepoints.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Tool versions verified against npm/upstream; integration points read from repo CI plus config; zero new runtime deps. |
| Features | HIGH | Levers codebase-verified (floating-ui, virtualizer, `attachInternals` sites); budget guidance from canonical web sources. |
| Architecture | HIGH | Grounded in actual repo (`vite.config.ts`, `.size-limit.json`, `src/internal/`, the 6 overlay sites); chokepoint structure confirmed. |
| Pitfalls | HIGH | Codebase-grounded (deps, `sideEffects`, `.size-limit.json` ignore list, `:has()` usage); cross-engine ARIA-reflection facts web-verified. |

**Overall confidence:** HIGH

### Gaps to Address (open questions from the Phase-1 baseline)
- **Low-end CPU/network throttle profile:** exact multiplier and network tier; resolve empirically from the Phase-1 baseline run and pin in harness config.
- **Per-entry brotli budgets:** exact KB numbers; set from measured baseline, not guessed.
- **CI perf-gate variance:** can the shared GitHub runner enforce, or does perf need a dedicated/manual-dispatch runner? Characterize the noise floor before flipping.
- **True per-capability browser floor:** FACE vs ARIA reflection vs CSS `:has()` / `adoptedStyleSheets`; resolved in the widened-engine phase; floor = max(JS-API floor, CSS-feature floor).
- **Tier-2 hidden-input fallback:** whether enterprise demand justifies the Changeset; hold pending a product decision.

## Sources

### Primary (HIGH confidence)
- Repo files: `package.json`, `.github/workflows/ci.yml`, `.size-limit.json`, `vite.config.ts`, `vitest.config.ts`, `src/internal/controllers/floating-position.ts`, `src/internal/helpers/virtualize-support.ts`, form-control `attachInternals` sites, `scripts/cem-diff.mjs` / `build-audit.mjs`, `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`; chokepoints, frozen-surface decisions, ignore-list, highlight.js confirmed dev-only.
- npm/upstream: `tachometer` 0.7.2, `rollup-plugin-visualizer` 7.0.1, size-limit `--why` / `@size-limit/esbuild-why`, Vitest Browser Mode `instances`, Playwright CDP (Chromium-only throttling).
- Lit 3 / floating-ui / `@lit-labs/virtualizer` 2.1.1 docs: adoptedStyleSheets fallback, async `computePosition`, offscreen-element removal.
- MDN ElementInternals; WebKit blog plus commit (id-ref ARIA reflection landed after base FACE); per-capability floor.

### Secondary (MEDIUM confidence)
- web.dev / CSS-Tricks: ElementInternals plus hidden-input legacy pattern.
- Smashing Magazine / Front-End Checklist: code-splitting, 130-170 KB slow-network/low-CPU budget envelope.
- lit/lit discussion #3362, AG Grid accessibility: virtualized set-size / rowcount authoring.

---
*Research completed: 2026-08-20*
*Ready for roadmap: yes*
