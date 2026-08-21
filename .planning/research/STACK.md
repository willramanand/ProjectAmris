# Stack Research

**Domain:** Performance + bundle-size + cross-engine hardening tooling for a frozen-API, ESM-only, Lit-peer Web Component library (Amris v1.1)
**Researched:** 2026-08-20
**Confidence:** HIGH (tool versions verified against npm/upstream; integration points read directly from repo CI + config)

## TL;DR Recommendation

Add **four** small, dev-only tools and **reuse three existing lanes** — do NOT add a perf framework:

1. **Cross-engine (c):** add `firefox` + `webkit` instances to the EXISTING Vitest Browser Mode lane. Zero new deps; only `npx playwright install firefox webkit` in CI.
2. **Bundle attribution (b):** add `rollup-plugin-visualizer` (dev, local report) + `@size-limit/esbuild-why` (unlocks `--why` on the existing size-limit gate). Add size-limit entries for `tokens.css` and heavy-dep chunks.
3. **Runtime perf under throttle (a):** a small in-repo harness on the EXISTING Vitest+Playwright Chromium lane, using a `CDPSession` (`Emulation.setCPUThrottlingRate`, `Network.emulateNetworkConditions`, `Performance.getMetrics`) to emit a metrics JSON, gated by a committed baseline diff script (mirror `scripts/cem-diff.mjs`).
4. **Statistically-rigorous A/B (a, local/optional-CI):** `tachometer` for heavy-component render/update micro-benchmarks when the CDP harness's variance is too high to trust a delta. Local-first; promote to a manual CI job only if needed.
5. **Feature detection (d):** NO tooling — plain TS guards in `src/internal/`, tested by adding `deleteProperty`/undefined-global cases to the existing browser + jsdom lanes.

**Zero new consumer-facing runtime dependencies.** Every addition is `devDependencies`.

---

## Recommended Stack

### Core Technologies (additions)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `rollup-plugin-visualizer` | 7.0.1 | Per-entry bundle payload attribution (treemap, gzip+brotli sizes) for the Vite/Rollup build | Native to the existing Rollup-under-Vite build — no bundler swap. Answers "what pulls in `@floating-ui/dom`" per entry with module-level treemaps. Emits a static HTML report (`--emitFile`), dev-only, never ships. |
| `@size-limit/esbuild-why` | 13.x (match installed size-limit 13) | Adds `--why` cost breakdown to the EXISTING size-limit gate (preset-small-lib uses esbuild, so the webpack/Statoscope `--why` path does NOT apply) | Reuses the gate already blocking CI. `preset-small-lib` = `@size-limit/esbuild` + `@size-limit/file`; `--why` on esbuild requires this companion package. Lets you attribute a budget breach without a second toolchain. |
| `tachometer` | 0.7.2 | Statistically-rigorous, browser-based A/B micro-benchmark of individual component render/update cost | Lit's own benchmarking tool — purpose-built for Web Component render timing with automatic-sampling-until-significant (up to 3 min) and multi-version/multi-browser round-robin. Use for the heavy components (data-grid, combobox, overlays) where you need a trustworthy before/after delta, not a raw number. Local-first. |

### Supporting Libraries / Configuration Changes (no new packages)

| Change | Where | Purpose | When to Use |
|--------|-------|---------|-------------|
| Add `{ browser: 'firefox' }`, `{ browser: 'webkit' }` instances | `vitest.config.ts` `browser.instances[]` | Widen engines on the SAME fidelity lane already running Chromium | Run the small existing `test/browser/**` set (ElementInternals, focus trap, `<dialog>`, floating-ui) across 3 engines — cheap engine-widening without a per-component matrix. |
| `CDPSession` throttle harness | new `test/perf/**` (browser project, Chromium-only) | CPU + network throttle + heap metrics feeding a JSON artifact | `Emulation.setCPUThrottlingRate`, `Network.emulateNetworkConditions`, `Performance.getMetrics` (JSHeapUsedSize), `PerformanceObserver`/`performance.now()` around render/update. |
| New size-limit entries | `.size-limit.json` | Attribute CSS/token + heavy-dep-chunk delivery cost | Add `dist/styles/tokens.css` and the internal floating-ui/virtualizer chunk paths so slow-network payload is budgeted, not just the two aggregate bundles. |
| Baseline-diff perf gate script | new `scripts/perf-diff.mjs` | Compare emitted metrics JSON to a committed `api/perf.baseline.json` | Mirror the proven `scripts/cem-diff.mjs` + `custom-elements.baseline.json` pattern: report-only first, then fail-on-regression. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Playwright CDP (`page.context().newCDPSession(page)`) | Throttling + metrics | Already installed (`playwright` 1.62.1). CDP is **Chromium-only** — WebKit/Firefox get correctness/feature-detection coverage, not throttled perf numbers. Document this split explicitly. |
| `performance.measureUserAgentSpecificMemory()` (optional) | Precise heap in crossOriginIsolated Chromium | Prefer CDP `Performance.getMetrics` (`JSHeapUsedSize`) — simpler, no COOP/COEP headers needed in the test harness. |
| `npx playwright install firefox webkit` | CI engine binaries | One added CI step in the existing `browser` job; ~tens of MB, cached by setup-node npm cache + Playwright cache. |

## Installation

```bash
# Dev-only bundle attribution + size-limit why
npm install -D rollup-plugin-visualizer@^7.0.1 @size-limit/esbuild-why@^13

# Optional statistically-rigorous component benchmarks (local-first)
npm install -D tachometer@^0.7.2

# CI: widen engines on the existing browser lane
npx playwright install firefox webkit   # add to .github/workflows/ci.yml browser job
```

No changes to `dependencies` or `peerDependencies`. `lit` stays a peer dep; nothing bundles Lit.

## Integration With the Existing Four CI Gates

| Existing gate (ci.yml job) | v1.1 change | Blocking? |
|----------------------------|-------------|-----------|
| `verify` (typecheck + jsdom coverage) | Feature-detection unit tests land here (jsdom: simulate missing `attachInternals`, undefined `ElementInternals`). Coverage thresholds already ratchet — new guard branches raise floors. | Yes (existing) |
| `browser` (Vitest Browser + Chromium + axe) | Add `firefox`+`webkit` instances; add `npx playwright install firefox webkit`. New `test/perf/**` Chromium-only throttle harness runs here (or a sibling `perf` job) emitting `perf.json`. | Cross-engine correctness: Yes. Perf: **report-only first**, then enforcing. |
| `size` (size-limit, Node 22) | Add `tokens.css` + heavy-chunk entries; wire `@size-limit/esbuild-why` for breach diagnosis; tighten limits from the measured baseline. | Yes (existing) — new budgets ratchet down like coverage floors. |
| `surface-diff` (CEM baseline) | Untouched. Perf/size work must stay surface-preserving; if degradation changes a component's observable behavior, it needs a Changeset (per PROJECT constraint). New `perf-diff.mjs` gate is modeled on this job's baseline-diff pattern. | Yes (existing) |

**CI vs local split:**
- **CI:** cross-engine browser lane, size-limit (+entries), report-only→enforcing perf-diff. All deterministic-enough for headless GitHub runners.
- **Local-only:** `rollup-plugin-visualizer` HTML report (developer inspection), `tachometer` A/B runs (needs low-noise machine for tight significance; CI runners are too noisy for its default 3-min significance loop unless run as an opt-in manual workflow_dispatch job).

## Key Finding: highlight.js Does NOT Ship

`highlight.js` is a **devDependency used only by Storybook docs** — `grep` finds zero imports under `src/`. It is external to every `dist/` entry and never reaches consumers. **No bundle-reduction work is needed for it** (the milestone brief's assumption is incorrect here). Focus dep-deferral effort on `@floating-ui/dom` (9 component files + `internal/controllers/floating-position.ts`) and `@lit-labs/virtualizer` (data-grid/combobox/select popups), which ARE runtime deps of the shipped chunks.

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Lighthouse / Lighthouse CI** | Page/app-level scoring (FCP/LCP/TBT on a real navigated URL). A component library has no page to score; metrics are dominated by the harness page, not the component. Over-tooling for a client-only ESM lib with no SSR. | CDP `Emulation.setCPUThrottlingRate` + `Performance.getMetrics` on the existing Vitest+Playwright lane, scoped to component render/update. |
| **webpack-bundle-analyzer** | Wrong bundler — the build is Vite/Rollup + esbuild (size-limit). Would need a parallel webpack config. | `rollup-plugin-visualizer` (Rollup) + `@size-limit/esbuild-why` (size-limit path). |
| **`@web/test-runner` / `@web/dev-server` + benchmark plugins** | Duplicates the already-invested Vitest Browser Mode + Playwright lane; two browser-test toolchains to maintain. | Reuse the Vitest browser project; add engines/perf specs there. |
| **Puppeteer** | Redundant — Playwright (with CDP access) is already a dependency and drives the browser lane. | Existing `playwright`. |
| **`bundlesize` / `bundlewatch`** | size-limit already gates gzip budgets in CI and is Node-22-pinned in the `size` job. | Extend `.size-limit.json`. |
| **`element-internals-polyfill` (or any ElementInternals shim)** | Explicit PROJECT constraint: not fully polyfillable, collides with the frozen surface, and the decision is degrade-not-polyfill below Safari 16.4. | Feature detection + graceful form degradation in `src/internal/`. |
| **`core-js` / babel polyfills** | ESM-only, degrade-not-polyfill posture; polyfills bloat the payload you are trying to shrink. | Cheap `typeof`/`in` feature guards, fallbacks in template logic. |
| **Karma** | Deprecated/EOL. | Vitest browser lane. |
| **`benchmark.js` (in-Node)** | Node microbench can't measure real Shadow-DOM render/layout/paint cost or throttled main-thread work. | `tachometer` (real browser) or the CDP harness. |

## Feature-Detection Approach (d) — no new tooling

Implement as plain TypeScript guards on the existing non-exported `src/internal/` boundary (keeps them off the frozen CEM surface):

```ts
// src/internal/env/capabilities.ts (illustrative)
export const HAS_ELEMENT_INTERNALS =
  typeof HTMLElement !== 'undefined' &&
  'attachInternals' in HTMLElement.prototype &&
  typeof ElementInternals !== 'undefined' &&
  'setFormValue' in ElementInternals.prototype;
```

Testing without a browser matrix explosion:
- **jsdom lane:** delete/undefine `attachInternals` on a cloned prototype (or stub `attachInternals` to throw) and assert the component still renders + emits events (degraded, not crashed) — matches the existing "Form Integration Failure" error-handling contract.
- **browser lane (Chromium/WebKit/Firefox):** assert the happy path where internals exist; WebKit 16.4 is the documented floor. Below-floor behavior is proven by the jsdom capability-off tests, not by chasing old browser binaries.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| CDP throttle harness on Vitest+Playwright | `tachometer` as the primary perf gate | If per-component render deltas are the ONLY perf metric you gate and CDP-harness variance proves untrustworthy — but tachometer is noisier to run in CI and doesn't give CPU/network throttle or heap out of the box. Keep it as the local A/B second opinion. |
| `rollup-plugin-visualizer` | `esbuild-visualizer` / `@viz-kit/esbuild-analyzer` | If you want the visual treemap of the **size-limit** esbuild bundle specifically (matches the gate's numbers) rather than the Rollup build. `@size-limit/esbuild-why` already covers the "why did the budget break" question, so the extra visualizer is optional. |
| Add engines to Vitest instances | Separate Playwright test project | Only if you outgrow Vitest browser mode's assertion ergonomics — not the case for the small `test/browser/**` set. |
| CDP `Performance.getMetrics` heap | `performance.measureUserAgentSpecificMemory()` | When you need precise, GC-safe per-object memory and can add COOP/COEP crossOriginIsolation to the harness page. Overkill for a regression gate; use CDP metrics. |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `rollup-plugin-visualizer@7` | Vite 8 / Rollup 4 | Rollup output plugin; add under `build.rollupOptions.plugins`, gate behind an env flag so normal builds stay clean. |
| `@size-limit/esbuild-why@13` | `size-limit@13`, `@size-limit/preset-small-lib@13` | Must match the installed size-limit major (13). Runs in the Node-22 `size` job (size-limit 13 requires Node ≥22.18 — already handled). |
| `tachometer@0.7.2` | Node 20/22, Playwright/WebDriver browsers | Standalone runner; does not touch the library build. Keep its config out of the shipped package. |
| Vitest 4 browser `instances` (firefox/webkit) | `@vitest/browser-playwright@4.1.9`, `playwright@1.62.1` | Multi-instance API confirmed for Vitest 4; each instance can carry its own `setupFiles` — keep the fidelity lane's "no setup files" rule per engine. |
| TypeScript 6.0.3 | all above (dev-only) | Per CLAUDE.md, pin to latest stable 5.x if 6.x instability surfaces; none of these tools force a TS version. |

## Stack Patterns by Variant

**If baseline variance on GitHub runners is high (likely):**
- Gate perf **report-only** first; commit `api/perf.baseline.json`; only flip `perf-diff.mjs` to fail-on-regression once you've measured run-to-run noise and set thresholds above it (same discipline as the coverage floors "just under measured").
- Because CDP throttling is Chromium-only, the enforcing perf gate is a **Chromium job**; WebKit/Firefox stay correctness-only.

**If a single heavy component (data-grid) dominates the budget:**
- Use `tachometer` locally to A/B a specific optimization (virtualization tuning, fewer re-renders) with statistical significance before committing, then let the CDP harness + size-limit lock the win in CI.

**If slow-network payload is the priority:**
- Budget `tokens.css` and the shared floating-ui/virtualizer chunks as first-class size-limit entries; visualizer treemaps show whether a per-component deep import accidentally drags a heavy shared chunk.

## Sources

- npm `tachometer` — v0.7.2 (Google/Lit statistically-rigorous browser benchmark runner); https://www.npmjs.com/package/tachometer , https://github.com/google/tachometer — HIGH
- npm `rollup-plugin-visualizer` — v7.0.1 (treemap/gzip/brotli, Vite/Rollup); https://www.npmjs.com/package/rollup-plugin-visualizer — HIGH
- Vitest docs — Browser Mode multiple `instances` (chromium/firefox/webkit), per-instance setup; https://vitest.dev/guide/browser/ , https://vitest.dev/config/browser/playwright — HIGH
- Playwright/CDP — `Emulation.setCPUThrottlingRate`, `Network.emulateNetworkConditions` are Chromium-only via `newCDPSession`; https://github.com/microsoft/playwright/issues/32618 — HIGH
- size-limit — `--why` uses Statoscope for the webpack path; esbuild path needs `@size-limit/esbuild-why`; https://github.com/ai/size-limit (issues #302, #274) — HIGH
- Repo files read: `package.json`, `.github/workflows/ci.yml`, `.size-limit.json`, `vitest.config.ts`, `vite.config.ts`, `.planning/PROJECT.md`; `grep` confirmed highlight.js has zero `src/` imports (Storybook-only) and floating-ui/virtualizer are the real shipped runtime deps — HIGH

---
*Stack research for: perf/size/compat hardening tooling, frozen-API Lit Web Component library*
*Researched: 2026-08-20*
