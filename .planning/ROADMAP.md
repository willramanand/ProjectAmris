# Roadmap: Amris v1.1

## Overview

Amris v1.1 continues the frozen-v1.0 library into a **performance-and-compatibility hardening** milestone. Phases are workstreams in research-convergent order — **measure first, then cut, then reach further, then lock in** — and every change is behavior- and surface-preserving against the frozen v1.0 CEM **except COMPAT-03**, which ships with a Changeset.

Phase 7 stands up a reproducible throttled measurement harness and committed size/perf baselines and picks the low-end target profile from real data — the universal prerequisite every later cut and budget depends on. Phase 8 banks the largest verified size win by deferring the real shipped heavy deps (`@floating-ui/dom`, `@lit-labs/virtualizer`) behind memoized dynamic imports, all behavior-preserving, with the byte win now visible in the re-scoped size metric. Phase 9 tunes the heaviest components' runtime cost against the real post-deferral graph, guarded by accessible-name/role snapshots. Phase 10 makes below-floor browsers degrade instead of silently failing — independently-probed capabilities, feature-detected forms, an opt-in hidden-input fallback, a CSS-feature audit, and a widened WebKit/Firefox/Chromium lane validating it against a documented true per-capability floor. Phase 11 locks the gains in and makes them visible: size budgets flip to enforcing first, then runtime count budgets (wall-clock stays report-only, staged off the release critical path), and per-component cost cards publish the final measured numbers.

> **Previous milestone:** v1.0 shipped 2026-08-20 (Phases 1–6, frozen and published). Its roadmap is archived at `.planning/milestones/v1.0-phases/ROADMAP.md`. v1.1 continues the phase numbering from **Phase 7**.

## Phases

**Phase Numbering:**

- Integer phases (7, 8, 9): Planned milestone work
- Decimal phases (8.1, 8.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 7: Measurement, Baselines & Budgets** - Reproducible throttled size + runtime-perf harness, committed baselines, and a data-chosen low-end target profile — the universal prerequisite for every later cut and budget (completed 2026-08-22)
- [x] **Phase 8: Bundle-Size Deferral** - Defer the real shipped heavy deps (`@floating-ui/dom`, `@lit-labs/virtualizer`) behind memoized dynamic imports, behavior-preserving, with the byte win now visible (completed 2026-08-22)
- [ ] **Phase 9: Runtime-Performance Tuning** - Cut re-render/reposition churn on the heaviest components against the post-deferral baseline, with a11y DOM provably intact
- [ ] **Phase 10: Graceful Degradation & Compatibility Matrix** - Below-floor browsers degrade instead of silently failing; widened WebKit/Firefox/Chromium lane validates it against a documented true floor
- [ ] **Phase 11: Gate Enforcement & Cost Publication** - Flip size + runtime-count budgets to enforcing (wall-clock stays report-only) and publish per-component cost cards

## Phase Details

### Phase 7: Measurement, Baselines & Budgets

**Goal**: A reproducible, throttled measurement harness and committed baselines exist so every later cut and budget is defended by real before/after numbers, and the low-end target profile is chosen from that data rather than guessed.
**Depends on**: Nothing (first v1.1 phase; builds on the frozen, published v1.0)
**Requirements**: MEAS-01, MEAS-02, MEAS-03, MEAS-04, MEAS-05
**Success Criteria** (what must be TRUE):

  1. Running `size-baseline.mjs` reproducibly captures a committed per-entry **brotli** (on-the-wire) bundle-size baseline. (MEAS-01)
  2. Running `perf-harness.mjs` on the Vitest Browser Mode + Playwright/Chromium lane emits both **count** metrics (render/update/`computePosition` calls, node counts) and wall-clock timings to a committed JSON baseline, under CDP CPU + network throttling. (MEAS-02)
  3. A named low-end target profile (CPU-throttle multiplier + network tier) chosen from the measured baseline data is pinned in harness config. (MEAS-03)
  4. `.size-limit.json` is re-scoped so the delivered-payload metric **counts** `@floating-ui/dom` (making the deferral win visible), and a separate assertion — independent of size-limit — proves Lit is never bundled. (MEAS-04)
  5. A dev-only bundle-attribution report (`rollup-plugin-visualizer` + `@size-limit/esbuild-why`) is available and confirms `highlight.js` is absent from every shipped chunk. (MEAS-05)

**Plans**: 7/7 plans executed (waves 1-4)
**Wave 1**

- [x] 07-00-PLAN.md — Setup & de-risk spikes: cdp() privilege (A2), Lit markers (A3), install 3 dev tools (wave 1)
- [x] 07-01-PLAN.md — Size baseline TRACER: brotli re-scope + size-baseline.mjs + committed baseline (MEAS-01/04, wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — No-bundled-Lit assertion + vite external snapshot (MEAS-04, wave 2)
- [x] 07-03-PLAN.md — Throttled perf harness: 4 scenarios, CDP throttle, count instrumentation, writeMetrics (MEAS-02, wave 2)
- [x] 07-05-PLAN.md — Bundle-attribution report + highlight.js-absent confirm (MEAS-05, wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-04-PLAN.md — perf-diff + data-pinned low-end profile + committed perf baseline (MEAS-03, wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-06-PLAN.md — Report-only CI wiring (perf + size jobs) + local-only tachometer config (all MEAS, wave 4)

### Phase 8: Bundle-Size Deferral

**Goal**: First-load and per-entry payloads shrink because the real shipped heavy deps load only when actually needed — behavior-preserving across all consumers — and the win is provable in the re-scoped size metric with no cross-entry duplication regressions.
**Depends on**: Phase 7 (baseline must prove the byte win; low-end profile pins the target)
**Requirements**: SIZE-01, SIZE-02, SIZE-03, SIZE-04, SIZE-05
**Success Criteria** (what must be TRUE):

  1. `@floating-ui/dom` loads via a memoized dynamic `import()` gated on first overlay open (in `src/internal/controllers/floating-position.ts`); all 6 overlays behave identically and positioning code is absent from non-overlay entries. (SIZE-01)
  2. `@lit-labs/virtualizer` loads via a memoized dynamic `import()` at/above the row threshold (in `src/internal/helpers/virtualize-support.ts`); data-grid and combobox/select popups behave identically. (SIZE-02)
  3. The tree-shaking canary proves an imported component still calls `customElements.define` at runtime (registration is never shaken away) and that Lit is never bundled. (SIZE-03)
  4. Shared-chunk dedupe and per-component deep-import purity are verified — no cross-entry duplication regressions introduced by the deferral. (SIZE-04)
  5. Non-critical component init is deferred off the first-load critical path (idle/deferred init), behavior-preserving, for faster slow-network first paint. (SIZE-05)

**Plans**: 7/7 plans executed (waves 1-3)

**Wave 1** *(tracer — floating-ui deferral proven end-to-end before expansion)*

- [x] 08-01-PLAN.md — TRACER: memoized loader + deferred FloatingPositionController + popover, no-0,0-frame + registration canary + size win legible (SIZE-01, SIZE-03)

**Wave 2** *(expansion — depends on 08-01; all component files owned independently, run in parallel)*

- [x] 08-02-PLAN.md — tooltip (arrow getter) + color-picker (loader-direct one-shot, NOT controller — Pitfall CP1) (SIZE-01)
- [x] 08-03-PLAN.md — rich-select (full controller migration) + dropdown type-only verify (SIZE-01)
- [x] 08-04-PLAN.md — combobox full deferral: size getter + virtualize swap + SIZE-05 idle sweep (SIZE-01, SIZE-02, SIZE-05)
- [x] 08-05-PLAN.md — select full deferral + virtualize-support.ts virtualizer-import deferral (SIZE-01, SIZE-02)
- [x] 08-06-PLAN.md — data-grid virtualize swap + SIZE-05 idle sweep (SIZE-02, SIZE-05)

**Wave 3** *(verification capstone — depends on all Wave-2 migrations)*

- [x] 08-07-PLAN.md — deep-import purity + shared-chunk dedupe + registration/no-bundled-Lit canary + final size/perf re-baseline (SIZE-03, SIZE-04)

### Phase 9: Runtime-Performance Tuning

**Goal**: The heaviest components do measurably less main-thread work on throttled CPUs — each change behavior-preserving and re-measured against the real post-deferral graph — without stripping any accessibility DOM.
**Depends on**: Phase 8 (tuning must measure against the post-deferral chunk graph, not the pre-deferral one)
**Requirements**: RPERF-01, RPERF-02, RPERF-03, RPERF-04
**Success Criteria** (what must be TRUE):

  1. Data-grid re-render-on-sort is narrowed behavior-preservingly and shows a **count + wall-clock** improvement against the post-deferral baseline. (RPERF-01)
  2. Combobox filter-per-keystroke work is reduced behavior-preservingly and re-measured as improved. (RPERF-02)
  3. Overlay reposition churn is reduced behavior-preservingly and re-measured as improved. (RPERF-03)
  4. Accessible-name/role snapshots guard each tuned component, proving the tuning provably does not strip a11y DOM (`aria-*`, roles, focusability). (RPERF-04)

**Plans**: TBD

### Phase 10: Graceful Degradation & Compatibility Matrix

**Goal**: Below the Safari 16.4 floor, elements degrade instead of silently failing — capabilities are probed independently, forms feature-detect ElementInternals (with an opt-in hidden-input fallback), CSS-feature failures are guarded — and a widened WebKit/Firefox/Chromium lane validates it all against a documented true per-capability floor. All surface-preserving **except COMPAT-03**, which ships with a Changeset.
**Depends on**: Phase 7 (the throttled browser-test lane and harness the widened matrix extends)
**Requirements**: COMPAT-01, COMPAT-02, COMPAT-03, COMPAT-04, COMPAT-05, COMPAT-06
**Success Criteria** (what must be TRUE):

  1. A memoized `src/internal/helpers/capabilities.ts` probes each sub-capability **independently** — ElementInternals form-association vs ARIA reflection, `adoptedStyleSheets`, `:has()` — verified by jsdom capability-off tests. (COMPAT-01)
  2. Form controls feature-detect ElementInternals so the constructor no longer throws below Safari 16.4 — the element still upgrades, renders, and emits events (surface-preserving). (COMPAT-02)
  3. Below the ElementInternals floor, a hidden-input Light-DOM fallback (`src/internal/helpers/form-participation.ts`) restores form submission, gated strictly on absent `setFormValue` (one channel XOR the other — no double-submit), and ships with a Changeset. (COMPAT-03) **[CS]**
  4. A CSS-feature audit (`:has()`, container queries, `adoptedStyleSheets`) identifies and guards silent visual failures on older engines. (COMPAT-06)
  5. The widened tested-engine matrix (WebKit + Firefox added to the load-bearing lane, CDP throttling stays Chromium-only) validates the degradation, and `BROWSER_SUPPORT.md` documents the true per-capability floor (= max(JS-API floor, CSS-feature floor)) and the degradation matrix. (COMPAT-04, COMPAT-05)

**Plans**: TBD

### Phase 11: Gate Enforcement & Cost Publication

**Goal**: The banked gains are locked in and made visible — size and runtime-count budgets flip from report-only to enforcing (size first, wall-clock stays report-only, the flip staged off the release critical path), and per-component cost cards publish the final measured numbers so enterprise consumers can budget.
**Depends on**: Phase 8, Phase 9, Phase 10 (enforce only after every baseline is trustworthy and all gains are banked; cost cards need the final measured numbers)
**Requirements**: GATE-01, GATE-02, GATE-03, DOCS-04
**Success Criteria** (what must be TRUE):

  1. Per-entry brotli size budgets flip from report-only to **enforcing first** (deterministic and stable) — a size regression now red-builds CI. (GATE-01)
  2. Runtime **count**-metric budgets (render/update/`computePosition` calls) flip to enforcing with thresholds set outside the measured noise floor; wall-clock timing stays report-only. (GATE-02)
  3. The gate flip is staged off the release critical path during soak, so flaky timing never red-builds a publish. (GATE-03)
  4. Per-component cost cards (measured brotli size + runtime cost per component) are published in docs so enterprise consumers can budget. (DOCS-04)

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8 → 9 → 10 → 11.
Phase 10 (graceful degradation) depends only on the Phase 7 harness/browser lane and could run in parallel with Phases 8–9; Phase 11 (gate enforcement) requires 8, 9, and 10 all complete so it locks in banked gains rather than blocking in-progress work.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Measurement, Baselines & Budgets | 7/7 | Complete    | 2026-08-22 |
| 8. Bundle-Size Deferral | 7/7 | Complete    | 2026-08-22 |
| 9. Runtime-Performance Tuning | 0/TBD | Not started | - |
| 10. Graceful Degradation & Compatibility Matrix | 0/TBD | Not started | - |
| 11. Gate Enforcement & Cost Publication | 0/TBD | Not started | - |
