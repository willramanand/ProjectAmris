# Phase 7: Measurement, Baselines & Budgets - Research

**Researched:** 2026-08-22
**Domain:** Reproducible throttled runtime-perf + brotli bundle-size measurement harness and committed baselines for a frozen-API, ESM-only, Lit-peer Web Components library (Amris v1.1)
**Confidence:** HIGH (all integration points read from repo this session; CDP + size-limit mechanics verified against official docs; count-instrumentation grounded on the actual first-party chokepoints)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (MEAS-03):** Target persona = **older device on cellular** (worst-case field/mobile), not enterprise-desktop. Harness measures a candidate grid — CPU-throttle {4×, 6×} × network {Slow-3G, Fast-3G}, centered on the harsh **6×+3G** corner — then **pins one named profile** (single CPU multiplier + single network tier) in harness config, chosen from measured data that best separates heavy from light components. Numeric pick is data-derived; intent baked in is worst-case cellular. Reversible.
- **D-02 (MEAS-01/04):** Committed brotli baseline is the **expanded** set:
  - Re-scope the existing 4 entries (core, full, button, data-grid) to **stop ignoring `@floating-ui/dom`** in the delivered-payload metric (keep `lit` ignored — peer dep, never shipped).
  - Add `dist/styles/tokens.css` as a budgeted entry.
  - Add a **first-load composite** metric (D-05).
  - Add a **marginal-cost-over-core** metric per component (component entry minus shared-core baseline) so shared-chunk moves aren't double-counted (Pitfall 2).
  - Gate/report unit: **brotli** (on-the-wire). gzip may be reported alongside; brotli is the number that matters, used consistently everywhere. Reversible.
- **D-03:** A **no-bundled-Lit assertion independent of size-limit** (size-limit `ignore`s `lit`, so it would mask an inlined copy — Pitfall 5). Grep emitted `dist/**/*.js` for inlined Lit markers / assert `lit` resolves only as a bare external specifier. Runs as its own check, wired **report-only** in CI this phase.
- **D-05:** First-load composite = **core + button + input + dialog** (light + form control + overlay). Chosen so the composite exercises the `@floating-ui/dom` deferral target via `dialog` and reflects a typical form-with-modal app's first load.
- **D-06:** Committed perf baseline scenarios = the Phase 8–9 optimization targets **plus a light control**:
  - `data-grid` — render + sort
  - `combobox` — filter-per-keystroke
  - overlay — open + reposition (one representative overlay; component TBD — see Discretion)
  - `button` — light-component control / noise-floor contrast
  Per scenario emit **count metrics** (Lit render/update call counts, `computePosition` invocations, DOM node counts) — the numbers later phases gate on — **plus** wall-clock timings, which stay report-only. Reversible.
- **D-07:** Each perf scenario runs **5 repeats**; the committed baseline records the **median** (reported number) **and a mean+3σ variance band**. Phase 11 sets enforcing thresholds *outside* that band so flaky timing never red-builds (Pitfall 15). Reversible.
- **D-08:** Phase 7 wires **both** the re-scoped size-limit and the new perf-diff as **report-only CI jobs now** — numbers post on every PR, nothing red-builds. Flip to enforcing is Phase 11 (size first → runtime counts → wall-clock stays report-only). perf-diff mirrors `scripts/cem-diff.mjs` + committed-baseline pattern. Reversible.
- **D-09 (MEAS-05):** Dev-only bundle-attribution report = **`rollup-plugin-visualizer`** (gated behind an env flag so normal builds stay clean) **+ `@size-limit/esbuild-why@13`** (matches installed size-limit 13, runs on the Node-22 size job). Confirms `highlight.js` absent from every shipped chunk. **`highlight.js` is already a devDependency — MEAS-05 is confirm-only, no dep move needed.**
- **D-10:** **`tachometer`** added as a committed **local-only, ungated** A/B config for the heavy components (data-grid, combobox, overlays). Never in CI, never a gate.
- **D-11:** CDP throttling is **Chromium-only**. The perf harness runs Chromium-only; WebKit/Firefox (added later for COMPAT-04, Phase 10) get correctness-only coverage, **no throttled perf numbers**. Document this split explicitly.

### Claude's Discretion
- Exact file locations/names following the established pattern: `scripts/size-baseline.mjs`, the perf harness (`perf-harness.mjs` and/or under `test/perf/**` on the browser lane), `scripts/perf-diff.mjs` (clone of `cem-diff.mjs`), committed baselines under `api/` (e.g. `api/perf.baseline.json`; the size baseline is the re-scoped `.size-limit.json`). Planner picks precise paths.
- Which single overlay represents "overlay" in the perf scenario (tooltip vs dropdown vs popover) — pick the most representative open→position→focus path; document it.
- Whether the marginal-cost metric uses size-limit's `import` syntax or a per-entry-minus-core diff.
- Exact CPU multipliers / tiers in the candidate grid beyond the 4×/6× × 3G center, if data warrants.

### Deferred Ideas (OUT OF SCOPE)
- Flipping any gate to **enforcing** → Phase 11 (GATE-01/02/03); wall-clock stays report-only.
- Throttled perf on WebKit/Firefox → not possible (CDP Chromium-only); those engines get correctness-only in Phase 10 (COMPAT-04).
- `manualChunks` shared-runtime dedupe tuning → deferred (PERF-V2-01), only if the chunk graph shows cross-entry duplication.
- The actual deferral/tuning cuts (Phases 8–9), graceful degradation (Phase 10). Phase 7 is **measure + baseline + report-only wiring ONLY**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAS-01 | `size-baseline.mjs` reproducibly captures a committed per-entry **brotli** (on-the-wire) bundle-size baseline. | size-limit v13 defaults to brotli; `gzip:true` on current entries must be removed. Standalone brotli for `tokens.css`/composite via Node `zlib.brotliCompressSync`. See §Standard Stack, §Code Examples. |
| MEAS-02 | `perf-harness.mjs` on the Vitest Browser + Playwright/Chromium lane emits **count** metrics + wall-clock to a committed JSON baseline, under CDP CPU+network throttling. | `cdp()` from `vitest/browser` (Chromium+playwright only) drives `Emulation.setCPUThrottlingRate` + `Network.emulateNetworkConditions`; count instrumentation wraps first-party lifecycle/controller prototypes + MutationObserver. See §Architecture Patterns, §Code Examples. |
| MEAS-03 | A named low-end target profile (CPU multiplier + network tier) chosen from measured baseline data pinned in harness config. | Candidate grid 4×/6× × Slow/Fast-3G; profile constants in a shared harness config module. See §Architecture Patterns "Throttle profile". |
| MEAS-04 | `.size-limit.json` re-scoped so delivered-payload counts `@floating-ui/dom`, plus a separate no-bundled-Lit assertion. | Remove `@floating-ui/dom` from `ignore` (keep `lit`); no-bundled-Lit via dist grep for Lit version-marker globals + external-list snapshot. See §Don't Hand-Roll, §Code Examples. |
| MEAS-05 | Dev-only bundle-attribution report confirming `highlight.js` absent from every shipped chunk. | `rollup-plugin-visualizer` (env-gated in vite.config) + `@size-limit/esbuild-why` (`--why`). highlight.js already devDep + zero `src/` imports. See §Standard Stack. |
</phase_requirements>

## Summary

This phase is pure instrumentation on top of an already-built fidelity lane. Nothing about the shipped library changes; the work is (1) a **brotli size baseline** driven by the existing size-limit v13 gate plus a small standalone brotli measurement for `tokens.css` and composites, (2) a **throttled runtime-perf harness** that runs inside the existing Vitest Browser Mode + Playwright/Chromium project, and (3) two zero-dependency Node diff scripts + committed baselines that mirror the proven `scripts/cem-diff.mjs` pattern.

The single highest-value mechanic — and the one most likely to be guessed wrong — is **how to obtain a CDP session inside a Vitest browser test**. Vitest 4 exposes `cdp()` from `vitest/browser` [CITED: vitest.dev/api/browser/context], returning a Playwright `CDPSession` with `.send()`, but **only** with the playwright provider on chromium **and only when the browser server API grants write+exec** (`allowWrite`/`allowExec`). This is the clean path — no custom command needed for throttling. A Node-side custom command (`browser.commands`) is still needed to **write the metrics JSON to disk**, because browser-mode tests execute in the page and cannot touch the filesystem.

Count metrics are made engine-independent (Pitfall 1/15) by instrumenting **first-party code the harness already owns**: wrap the component's Lit lifecycle hooks (`update`/`updated`/`render` — public overridable ReactiveElement API) and the shared `FloatingPositionController._updatePosition` prototype, plus a `MutationObserver` on the floating element's `style` attribute as an instrumentation-free cross-check of reposition count. **No `@floating-ui/dom` or Lit library internal is patched.**

**Primary recommendation:** Build `test/perf/*.perf.test.ts` specs on a **new dedicated Chromium-only `perf` Vitest project** (write+exec enabled, no setupFiles) that throttle via `cdp()`, count via first-party prototype wraps, persist via a `writeMetrics` custom command; add `scripts/size-baseline.mjs` + `scripts/perf-diff.mjs` as zero-dep clones of `cem-diff.mjs`; re-scope `.size-limit.json` to brotli + count floating-ui; wire both as report-only CI jobs. Do not add a perf framework.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Brotli on-the-wire size measurement | Build tooling (Node/size-limit CLI) | — | size-limit reads emitted `dist/**`; brotli is a byte-level property of the artifact, no browser needed |
| Throttled runtime measurement (CPU/network) | Browser test lane (Vitest+Playwright Chromium) | CDP (Node-side, via `cdp()` bridge) | Throttling + real layout only exist in a real engine; jsdom is meaningless for cost (Pitfall 1) |
| Count-metric instrumentation | Browser test lane (in-page, first-party prototype wraps) | — | Lifecycle/controller counters live where the components run; counts are engine-independent |
| Metrics-JSON persistence | Node (Vitest custom command) | — | Browser-mode tests cannot write files; the command runs server-side |
| Baseline diff + report-only gate | Build tooling (zero-dep Node script) | CI (GitHub Actions job) | Mirrors `cem-diff.mjs`; deterministic, no browser |
| Bundle attribution report | Build tooling (Rollup plugin + size-limit `--why`) | Local dev / Node-22 size job | Attribution is a build-graph property; dev-only, env-gated |

## Standard Stack

### Core (additions — all devDependencies, zero consumer-facing runtime deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `rollup-plugin-visualizer` | ^7.1.1 (installed target ^7.0.1 per STACK.md; 7.1.1 is current latest) | Per-entry bundle payload attribution (treemap, gzip+brotli) for the Vite/Rollup build; confirms `highlight.js` ships nowhere (MEAS-05) | Native to the existing Rollup-under-Vite build — no bundler swap. Emits a static HTML report, dev-only, env-gated. [VERIFIED: npm registry — `npm view` returned 7.1.1 this session] [CITED: STACK.md — verified against npm/upstream, HIGH] |
| `@size-limit/esbuild-why` | ^13.0.3 | Adds `--why` cost breakdown to the EXISTING size-limit gate (preset-small-lib uses esbuild, so the webpack/Statoscope `--why` path does NOT apply) | Must match installed `size-limit@13.0.3` / `@size-limit/preset-small-lib@13.0.3`. Official size-limit companion pkg. [VERIFIED: npm registry — `npm view` returned 13.0.3 this session, exact major match] [CITED: STACK.md HIGH] |
| `tachometer` | ^0.7.2 | Statistically-rigorous browser A/B micro-benchmark for heavy components; **local-only, never CI** (D-10) | Lit's own benchmark tool (google/tachometer); auto-sampling-until-significant. [VERIFIED: npm registry — `npm view` returned 0.7.2 this session] [CITED: STACK.md HIGH] |

### Supporting (no new packages — reuse installed toolchain)
| Change | Where | Purpose |
|--------|-------|---------|
| `cdp()` throttle bridge | `test/perf/**` (new Chromium-only `perf` project) | `Emulation.setCPUThrottlingRate`, `Network.emulateNetworkConditions`. Uses installed `@vitest/browser-playwright@4.1.9` + `playwright@^1.62.1`. |
| `writeMetrics` custom command | `vitest.config.ts` `test.browser.commands` | Node-side `fs.writeFileSync` of the metrics JSON (browser tests can't write files). |
| Node `zlib.brotliCompressSync` | `scripts/size-baseline.mjs` | Standalone brotli for `tokens.css` + composites (Node 22, built-in). |
| Re-scoped size-limit entries | `.size-limit.json` | Count floating-ui, add tokens.css + composite + marginal metrics; switch reporting to brotli. |
| Zero-dep diff scripts | `scripts/size-baseline.mjs`, `scripts/perf-diff.mjs` | Clone `cem-diff.mjs` shape: committed baseline JSON, structured diff, report-only exit. |

### Alternatives Considered (from STACK.md "What NOT to Use" — do not reopen)
| Instead of | Rejected | Why |
|------------|----------|-----|
| CDP on Vitest+Playwright | Lighthouse / Lighthouse-CI | Page-level scoring; a component lib has no page to score |
| `rollup-plugin-visualizer` | webpack-bundle-analyzer | Wrong bundler (build is Vite/Rollup+esbuild) |
| Reuse Vitest browser lane | `@web/test-runner`, Puppeteer, Karma | Duplicate/deprecated toolchains |
| Extend `.size-limit.json` | `bundlesize`/`bundlewatch` | size-limit already gates and is Node-22-pinned |
| `tachometer`/CDP | `benchmark.js` (in-Node) | Node microbench can't measure Shadow-DOM render/layout/throttled main-thread |

**Installation:**
```bash
npm install -D rollup-plugin-visualizer@^7.1.1 @size-limit/esbuild-why@^13.0.3 tachometer@^0.7.2
```
No changes to `dependencies`/`peerDependencies`. `lit` stays a peer dep; nothing bundles Lit. **After install, run `npm install` in each active worktree** (dep-adding plan — per MEMORY.md worktree note).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `rollup-plugin-visualizer` | npm | mature (v7 line) | high (millions/wk) | github.com/btd/rollup-plugin-visualizer | OK | Approved (env-gated, dev-only) |
| `@size-limit/esbuild-why` | npm | tracks size-limit | ships with size-limit monorepo | github.com/ai/size-limit | OK | Approved (matches installed major 13) |
| `tachometer` | npm | mature | moderate | github.com/google/tachometer | OK | Approved (local-only, never CI) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
All three are named in HIGH-confidence STACK.md sourced from official repos, exist on npm (verified via `npm view` this session), and are dev-only. Version pins verified: 7.1.1 / 13.0.3 / 0.7.2 latest. The planner may still add a single `checkpoint:human-verify` before the `npm install -D` task per house policy, but no legitimacy risk was found.

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────── SIZE LANE (Node 22) ───────────────────────┐
  dist/**/*.js  ─────────▶│  size-limit (brotli, floating-ui counted, lit ignored)            │
  dist/styles/tokens.css ▶│    ├─ entries: core / full / button / data-grid (re-scoped)        │
                          │    ├─ tokens.css entry                                             │
                          │    ├─ first-load composite [core+button+input+dialog]              │
                          │    └─ marginal-over-core per component                             │
                          │  scripts/size-baseline.mjs → parses `size-limit --json`            │
                          │        + zlib.brotliCompressSync(tokens.css)                       │
                          │        → writes/reads committed .size-limit baseline               │
                          │  no-bundled-Lit check: grep dist for Lit version-marker globals    │
                          │        + snapshot vite external list  ── report-only               │
                          │  @size-limit/esbuild-why  --why (attribution on breach)            │
                          │  rollup-plugin-visualizer (env VISUALIZE=1) → dev HTML report      │
                          └────────────────────────────────────────────────────────────────────┘

                          ┌────────────── PERF LANE (Chromium-only, new `perf` project) ───────┐
  src/components/*  ─────▶│  test/perf/<scenario>.perf.test.ts   (runs IN the page)            │
  FloatingPositionCtrl ─▶ │    1. cdp() → Emulation.setCPUThrottlingRate {rate}                │
                          │              Network.emulateNetworkConditions {Slow/Fast-3G}       │
                          │    2. instrument (first-party prototype wraps + MutationObserver)  │
                          │    3. run scenario ×5   (render/sort, filter, open+reposition)     │
                          │    4. collect {counts, wall-clock} → median + mean+3σ              │
                          │    5. commands.writeMetrics(json)  ── Node writes api/perf.json    │
                          └───────────────────────────┬────────────────────────────────────────┘
                                                       ▼
                          scripts/perf-diff.mjs  (zero-dep, clone of cem-diff.mjs)
                             committed api/perf.baseline.json  ⟷  fresh api/perf.json
                             → structured report → exit 0 (report-only this phase)
```

### Recommended Project Structure
```
scripts/
├── size-baseline.mjs      # parse size-limit --json + standalone brotli; write/compare size baseline
├── perf-diff.mjs          # zero-dep diff of api/perf.json vs api/perf.baseline.json (clone cem-diff.mjs)
test/
└── perf/
    ├── harness.ts         # shared: THROTTLE_PROFILE, scenario registry, instrument()/measure() helpers
    ├── data-grid.perf.test.ts
    ├── combobox.perf.test.ts
    ├── overlay.perf.test.ts     # representative overlay (recommend am-popover — see below)
    └── button.perf.test.ts      # light control / noise floor
api/
├── perf.baseline.json     # committed count+timing baseline (median + mean+3σ band)
tachometer/                # local-only A/B config (D-10) — NOT in package `files`
└── *.json
```
The Discretion note allows a `perf-harness.mjs`; recommended mapping: the shared `test/perf/harness.ts` module holds the pinned `THROTTLE_PROFILE` (MEAS-03) and scenario helpers; a thin `scripts/perf-harness.mjs` may wrap `vitest run --project perf` + baseline write if a single named entrypoint is wanted. Keep filesystem writes in the Node custom command / diff script, never in the browser spec.

### Pattern 1: CDP throttling inside a Vitest browser test
**What:** Obtain a Playwright `CDPSession` in-test via `cdp()` and issue Emulation/Network commands.
**When to use:** Every perf scenario, before measuring.
**Requirements:** playwright provider + chromium **and** browser server API write+exec enabled. [CITED: vitest.dev/api/browser/context — "CDP is a privileged debugging API ... available only when browser API write and exec operations are enabled through api.allowWrite and api.allowExec"; "works only with the playwright provider and only when using chromium"]
```typescript
// test/perf/harness.ts  — Source: vitest.dev/api/browser/context (cdp signature)
import { cdp } from 'vitest/browser';

// D-01 candidate grid centered on the harsh corner; the PINNED profile (MEAS-03)
// is chosen from measured data and frozen here as the single named profile.
export const THROTTLE_PROFILE = {
  name: 'low-end-cellular',        // worst-case field/mobile intent (D-01)
  cpuRate: 6,                       // Emulation.setCPUThrottlingRate multiplier
  network: 'Slow-3G' as const,      // network tier (see NETWORK_TIERS)
};

// Chromium DevTools canonical 3G presets (bytes/sec, ms). [ASSUMED — see Assumptions A1]
export const NETWORK_TIERS = {
  'Slow-3G': { downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8, latency: 400, offline: false },
  'Fast-3G': { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150, offline: false },
};

export async function applyThrottle(p = THROTTLE_PROFILE): Promise<void> {
  const session = cdp();                                   // Playwright CDPSession
  await session.send('Emulation.setCPUThrottlingRate', { rate: p.cpuRate });
  await session.send('Network.emulateNetworkConditions', NETWORK_TIERS[p.network]);
}
```
Config to enable `cdp()` (in the new `perf` project — see Common Pitfalls for exact key uncertainty):
```typescript
// vitest.config.ts — new project alongside jsdom/browser
{
  test: {
    name: 'perf',
    include: ['test/perf/**/*.perf.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],   // D-11: Chromium-only
      api: { allowWrite: true, allowExec: true },   // REQUIRED for cdp() — verify exact key path (A2)
    },
  },
}
```

### Pattern 2: Engine-independent count instrumentation (no library internals patched)
**What:** Count Lit render/update and floating-ui reposition calls by wrapping **first-party** prototypes the harness imports, plus a `MutationObserver` cross-check.
**When to use:** Every count metric (the numbers Phase 11 gates on — must be deterministic).
```typescript
// Lit lifecycle counts: update()/updated()/render() are PUBLIC overridable
// ReactiveElement hooks. Wrapping the COMPONENT prototype is first-party, not a
// Lit internal patch. [CITED: lit.dev/docs/api/ReactiveElement — update/updated/render are overridable lifecycle]
function countLifecycle(Ctor: typeof HTMLElement & { prototype: any }) {
  const counts = { update: 0, updated: 0, render: 0 };
  for (const hook of ['update', 'updated', 'render'] as const) {
    const orig = Ctor.prototype[hook];
    Ctor.prototype[hook] = function (...args: unknown[]) {
      counts[hook]++;
      return orig.apply(this, args);
    };
  }
  return counts; // restore originals in afterEach
}

// computePosition counts: wrap the SHARED first-party controller chokepoint.
// FloatingPositionController._updatePosition is the single call site for combobox/
// select/dropdown/popover/tooltip/date-picker. [VERIFIED: src/internal/controllers/floating-position.ts:116-130
//   — `const { x, y, placement, middlewareData } = await computePosition(reference, floating, {...})`]
// NOTE: color-picker.ts and rich-select.ts call computePosition DIRECTLY (bypass the
// controller) — pick a controller-routed overlay for the scenario (see below).
import { FloatingPositionController } from '../../src/internal/controllers/floating-position';
// wrap FloatingPositionController.prototype['_updatePosition'] the same way.

// Engine-independent cross-check (zero instrumentation): every reposition does
// `Object.assign(floating.style, { left, top })` (floating-position.ts:128), an
// observable style mutation. Count them with a MutationObserver on the panel.
function countRepositions(panel: HTMLElement) {
  let n = 0;
  const obs = new MutationObserver(() => { n++; });
  obs.observe(panel, { attributes: true, attributeFilter: ['style'] });
  return { get count() { return n; }, stop: () => obs.disconnect() };
}

// DOM node counts: host.shadowRoot.querySelectorAll('*').length + light-DOM count.
```
**Recommended representative overlay (Discretion D-06):** **`am-popover`** — it is already the canonical floating-ui fixture in `test/browser/floating-position.test.ts` [VERIFIED: test/browser/floating-position.test.ts:32-68], routes through `FloatingPositionController` (so the count wrap works), and exercises the full open→position path (`trigger="manual"`, `placement="bottom-start"`, offset 8). Document the choice in `harness.ts`.

### Pattern 3: Measure ×5, record median + mean+3σ (D-07)
**What:** Run each scenario 5 times; report median as the number, store the mean+3σ variance band for Phase 11's enforcing thresholds.
```typescript
function summarize(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  const sd = Math.sqrt(samples.reduce((s, x) => s + (x - mean) ** 2, 0) / samples.length);
  return { median, mean, sd, band: mean + 3 * sd, samples };
}
// counts should be identical across repeats (deterministic) — assert stability;
// wall-clock is the noisy one the band protects (Pitfall 15).
```

### Pattern 4: Persist metrics JSON via a Node custom command (browser tests can't write files)
**What:** In-page test collects the metrics object, then calls a server-side command that writes the file.
[CITED: vitest.dev/api/browser/commands — custom commands execute server-side with `ctx.page`/`ctx.provider`; called from tests via `commands` import]
```typescript
// vitest.config.ts  test.browser.commands: { writeMetrics }
import type { BrowserCommand } from 'vitest/node';
import { writeFileSync } from 'node:fs';
export const writeMetrics: BrowserCommand<[string, unknown]> = async (_ctx, path, data) => {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
};
// in a spec:  import { commands } from 'vitest/browser';  await commands.writeMetrics('api/perf.json', result);
```

### Anti-Patterns to Avoid
- **Sourcing any runtime number from the jsdom project** — jsdom stubs layout; the number measures the mock (Pitfall 1). Perf lane is Chromium-only.
- **Patching `@floating-ui/dom` or Lit exports** to count — ESM live bindings make it fragile and it risks correctness. Wrap first-party prototypes / observe style mutations instead.
- **Gating on wall-clock** — counts gate, wall-clock reports (Pitfall 15, D-06).
- **Trusting size-limit for the no-Lit check** — it `ignore`s `lit`; an inlined copy is invisible (Pitfall 5, D-03). Separate check required.
- **Keeping `@floating-ui/dom` in `ignore`** on the delivered-payload metric — hides the Phase-8 win (Pitfall 2, D-02).
- **Writing files from inside a browser-mode spec** — not possible; use the custom command.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CPU/network throttling | A `setTimeout`-based fake slowdown | CDP `Emulation.setCPUThrottlingRate` + `Network.emulateNetworkConditions` via `cdp()` | Real main-thread throttle; the only faithful low-end simulation |
| Brotli byte size | Custom compressor | size-limit (brotli default in v13) + Node `zlib.brotliCompressSync` for standalone files | On-the-wire truth; matches registries |
| Baseline diff + gate | New comparator framework | Clone `scripts/cem-diff.mjs` (indexed-by-key, sorted, volatile fields stripped, report-only exit) | Proven in-repo pattern; zero deps; report-only→enforcing already designed |
| Bundle attribution | Manual chunk inspection | `rollup-plugin-visualizer` + `@size-limit/esbuild-why --why` | Module-level treemap answers "what pulls in X" |
| Statistical A/B of a cut | Averaging two `console.time`s | `tachometer` (local, D-10) | Auto-samples until significant; trustworthy delta |
| Metrics JSON write | Trying to `fs` from the page | Vitest `browser.commands` (Node-side) | Browser tests have no filesystem |

**Key insight:** Every hard part here already has a first-party home in the repo (cem-diff pattern, the browser lane, size-limit) or an official tool. The phase is wiring, not invention.

## Runtime State Inventory

> Greenfield-instrumentation phase — no renames/migrations. Included for completeness; the only "state" is committed baseline files that must be regenerated deterministically.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New committed baselines: `api/perf.baseline.json` + re-scoped `.size-limit.json`. No DB/datastore. | Generate once from a clean `npm run build`; commit. |
| Live service config | None — CI jobs are declared in `.github/workflows/ci.yml` (in git). | Add report-only jobs to ci.yml. |
| OS-registered state | None. | None. |
| Secrets/env vars | New dev-only build flag (e.g. `VISUALIZE=1`) gating `rollup-plugin-visualizer`; no secret. | Document the flag; default off. |
| Build artifacts | `dist/**` is the measurement input; regenerated by `npm run build`. tachometer config lives outside `files` (must not ship). | Ensure `tachometer/` and any perf report are excluded from `package.files` (currently `["dist","README.md"]` — already safe). [VERIFIED: package.json:48-51] |

**Nothing found requiring data migration** — baselines are first-generation.

## Common Pitfalls

### Pitfall 1: Wrong config key for `cdp()` write/exec gating
**What goes wrong:** `cdp()` throws/returns undefined if the browser server API doesn't grant write+exec. The docs name the options `api.allowWrite` / `api.allowExec` but the exact nesting in Vitest 4.1's config (top-level `test.api` vs `test.browser.api` vs per-instance) is not pinned by this research.
**Why it happens:** The privileged-CDP gate is recent; doc phrasing (`api.allowWrite`) is ambiguous about location.
**How to avoid:** During Wave 0, spike a one-line `cdp().send('Browser.getVersion')` and adjust the key until it resolves; pin the working shape in `vitest.config.ts` with a comment. Fall back to a **custom command** that does `ctx.page.context().newCDPSession(ctx.page)` (always available server-side with the playwright provider) if the in-test `cdp()` gate proves troublesome. [CITED: vitest.dev/api/browser/commands — `ctx.page` is the Playwright Page]
**Warning signs:** `cdp is not a function` / `CDP not allowed`; throttle silently no-ops (timings identical to unthrottled).

### Pitfall 2: Measuring perf in jsdom / unthrottled (Pitfall 1 of PITFALLS.md) 🧊
**What goes wrong:** Numbers taken in jsdom or on an unthrottled runner measure a mock; budgets never fire on the real target.
**How to avoid:** Perf lane is a **separate Chromium-only project**; never `--project jsdom`. Gate on counts (engine-independent), report wall-clock.
**Warning signs:** Identical timings laptop vs CI; microsecond timings for painting components.

### Pitfall 3: Brotli/gzip mismatch and shared-chunk double-count (Pitfall 2 of PITFALLS.md) 🧊
**What goes wrong:** Existing entries use `gzip:true`; mixing gzip and brotli across metrics, or summing per-entry sizes that share code, gives wrong numbers. Keeping `@floating-ui/dom` in `ignore` hides the Phase-8 win.
**How to avoid:** Switch **all** entries to brotli (remove `gzip:true`; brotli is v13 default [CITED: github.com/ai/size-limit — "gzip: true uses Gzip and disables Brotli"]). Keep `lit` ignored, drop `@floating-ui/dom` from `ignore` on the delivered-payload entries. Add a marginal-over-core metric so shared moves aren't double-counted.
**Warning signs:** A deferral PR changes shipped code but not the number; per-component budgets sum to > full bundle.

### Pitfall 4: No-bundled-Lit check that a chunking refactor can defeat (Pitfall 5 of PITFALLS.md) 🧊
**What goes wrong:** size-limit `ignore`s `lit`, so an accidentally-inlined Lit copy is invisible to the gate.
**How to avoid:** Two independent guards (D-03): (a) **snapshot the `external` list** in `vite.config.ts` [VERIFIED: vite.config.ts:220 — `external: ['lit', /^lit\//, /^@lit\//, /^@lit-labs\//, '@floating-ui/dom', /^@floating-ui\//]`] in a unit test; (b) grep emitted `dist/**/*.js` for Lit's global version-marker strings (`reactiveElementVersions`, `litHtmlVersions`, `litElementVersions`) — present only if Lit source is inlined [ASSUMED — see A3; validate against a deliberately-bundled fixture in Wave 0]. Assert `dist` imports `lit` as a bare specifier (`from"lit"`), not inlined.
**Warning signs:** `amris.js` grows but size gate green; consumer sees "multiple versions of Lit" warning.

### Pitfall 5: Node-version split — perf lane vs size lane
**What goes wrong:** size-limit@13 needs Node ≥22.18; the rest of CI is Node 20. Running the perf lane or perf-diff on the wrong Node can shift baselines or break size-limit.
**How to avoid:** Keep the size job on **Node 22** [VERIFIED: .github/workflows/ci.yml:88-90 — comment "size-limit@13 requires Node >=22.18; the rest of CI stays on Node 20"]. The perf lane needs only Playwright/Chromium; pin its runner Node explicitly and document it (Pitfall 15 of PITFALLS.md). perf-diff.mjs is zero-dep — Node-agnostic.
**Warning signs:** size-limit crashes on Node 20; perf baseline shifts when the runner Node changes.

### Pitfall 6: Representative-overlay picks a component that bypasses the controller
**What goes wrong:** `color-picker` and `rich-select` call `computePosition` directly [VERIFIED: grep — `computePosition` in color-picker.ts, rich-select.ts, and floating-position.ts only], so the controller-prototype count wrap misses them.
**How to avoid:** Pick a controller-routed overlay (`am-popover` recommended). Document it. If a direct-caller must be measured later, use the MutationObserver style-mutation count (works regardless of call path).

## Code Examples

### Re-scoped `.size-limit.json` (brotli, floating-ui counted, tokens.css + composite + marginal)
```jsonc
// Source: current .size-limit.json (repo) + size-limit config keys (github.com/ai/size-limit)
[
  { "name": "core bundle",  "path": "dist/amris-core.js", "ignore": ["lit"], "limit": "28 kB" },   // brotli default; floating-ui NO LONGER ignored (D-02)
  { "name": "full bundle",  "path": "dist/amris.js",      "ignore": ["lit"], "limit": "75 kB" },
  { "name": "button (light deep import)",    "path": "dist/components/button/index.js",    "ignore": ["lit"], "limit": "2.5 kB" },
  { "name": "data-grid (heavy deep import)", "path": "dist/components/data-grid/index.js", "ignore": ["lit"], "limit": "13 kB" },
  { "name": "tokens.css",   "path": "dist/styles/tokens.css", "limit": "X kB" },                     // D-02 new entry
  { "name": "first-load composite (core+button+input+dialog)",
    "path": ["dist/amris-core.js","dist/components/button/index.js","dist/components/input/index.js","dist/components/dialog/index.js"],
    "ignore": ["lit"], "limit": "X kB" }                                                             // D-05
  // marginal-over-core per component: either a per-entry-minus-core diff in size-baseline.mjs,
  // OR size-limit `import` syntax on the component barrel (Discretion).
]
```
Limits are **filled from the measured baseline** (floors just under measured, ratchet-to-final-floor per the coverage-gate discipline). All limits are **report-only this phase** (D-08) — the enforcing values land in Phase 11.

### `scripts/size-baseline.mjs` skeleton (mirror cem-diff structure)
```javascript
// Source: pattern from scripts/cem-diff.mjs; brotli via node:zlib
import { readFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const sizeLimitJson = JSON.parse(execFileSync('npx', ['size-limit', '--json'], { encoding: 'utf8' }));
const tokensBrotli = brotliCompressSync(readFileSync('dist/styles/tokens.css')).length;
// build { [name]: brotliBytes }, diff vs committed api/size.baseline.json (or the .size-limit limits),
// report-only exit 0 this phase (D-08).
```

### CI: report-only jobs slotting into ci.yml (alongside Node-20/Node-22 split)
```yaml
# Source: .github/workflows/ci.yml (existing verify/browser/surface-diff/size/smoke)
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }   # pin + document (Pitfall 5)
      - run: npm ci
      - run: npx playwright install chromium       # already used by `browser` job
      - name: Perf harness (Chromium, throttled) — report-only
        run: npm run test:perf && node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json
        # NO continue-on-error needed: perf-diff.mjs exits 0 this phase (report-only, D-08)
  # size job (Node 22, existing) gains: `npm run size` already runs; add no-bundled-Lit + esbuild-why steps report-only.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright driven from Node test file | Vitest Browser Mode runs test IN the page; CDP via `cdp()` bridge | Vitest 3→4 browser API | Must use `cdp()` / custom commands, not a Node `page` handle |
| size-limit default gzip | size-limit v11+ defaults to **brotli**; `gzip:true` opts back to gzip | size-limit v11 | Removing `gzip:true` gives on-the-wire brotli for free |
| Lighthouse/webpack-analyzer for lib perf | CDP throttle + rollup-visualizer/esbuild-why on the existing lane | this milestone's stack research | No page-level tooling for a component lib |

**Deprecated/outdated:** Karma, `bundlesize`/`bundlewatch`, in-Node `benchmark.js` for DOM perf — all rejected in STACK.md.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (jsdom + browser projects) + size-limit 13.0.3 + zero-dep Node diff scripts |
| Config file | `vitest.config.ts` (add `perf` project), `.size-limit.json` (re-scope) |
| Quick run command | `npm run test:perf` (new) — single Chromium perf project |
| Full suite command | `npm run test:run` + `npm run size` + `node scripts/perf-diff.mjs ...` + `node scripts/size-baseline.mjs` |

### Phase Requirements → Test Map
| Req ID | Behavior (observable signal) | Test Type | Automated Command | File Exists? |
|--------|------------------------------|-----------|-------------------|-------------|
| MEAS-01 | `size-baseline.mjs` emits a per-entry **brotli** number deterministically; re-run on unchanged `dist` produces identical bytes | integration | `node scripts/size-baseline.mjs && git diff --exit-code api/size.baseline.json` | ❌ Wave 0 |
| MEAS-02 | perf spec under CDP throttle emits `{counts, wallClock}` JSON; counts stable across 5 repeats; throttle actually applied (throttled timing ≫ unthrottled) | browser (perf project) | `npm run test:perf` (writes `api/perf.json`) | ❌ Wave 0 |
| MEAS-03 | `THROTTLE_PROFILE` pins one named CPU multiplier + tier; harness reads it; grid candidates documented | unit | assert `THROTTLE_PROFILE.cpuRate`/`.network` are set + `applyThrottle` sends both CDP commands | ❌ Wave 0 |
| MEAS-04a | `.size-limit.json` counts `@floating-ui/dom` (not in any delivered-payload `ignore`), reports brotli | unit | assert no delivered entry ignores `@floating-ui/dom`; assert no `gzip:true` | ❌ Wave 0 |
| MEAS-04b | no-bundled-Lit: `dist/**/*.js` contains zero Lit version-marker globals; `external` list snapshot matches | unit | grep `dist` for `reactiveElementVersions`/`litHtmlVersions`/`litElementVersions` → 0; snapshot external array | ❌ Wave 0 |
| MEAS-05 | attribution report shows `highlight.js` in NO shipped chunk | integration | `VISUALIZE=1 npm run build` → assert `highlight.js` absent from visualizer data / `size-limit --why` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:perf` (fast, single project) + `npm run size`
- **Per wave merge:** full suite + both diff scripts (report-only exit 0)
- **Phase gate:** baselines committed, both report-only CI jobs green (post numbers, never red)

### Wave 0 Gaps
- [ ] `vitest.config.ts` — new `perf` project (Chromium, write+exec, no setupFiles) + `writeMetrics` command
- [ ] `test/perf/harness.ts` — `THROTTLE_PROFILE`, `applyThrottle`, `instrument`, `summarize`
- [ ] `test/perf/{data-grid,combobox,overlay,button}.perf.test.ts` — the 4 scenarios (D-06)
- [ ] `scripts/size-baseline.mjs`, `scripts/perf-diff.mjs` — zero-dep, clone cem-diff.mjs
- [ ] `api/perf.baseline.json` (+ size baseline) — committed first-generation
- [ ] Wave-0 spike: confirm exact `api.allowWrite/allowExec` key path for `cdp()` (Pitfall 1)
- [ ] Wave-0 spike: confirm Lit version-marker strings against a deliberately-bundled fixture (A3)
- [ ] `package.json` scripts: `test:perf`, `size:why`, `visualize`; CI `perf` job + size-job additions
- [ ] `npm run test:run` unchanged; add no-bundled-Lit unit test to the jsdom `verify` lane

## Security Domain

> `security_enforcement` not set to false in scope; this is a dev-tooling/measurement phase with no runtime, network, auth, or data-handling surface added to the shipped library.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | minimal | Diff scripts read only committed baseline JSON + own emitted JSON (trusted, in-repo); no external input |
| V6 Cryptography | no | brotli is compression, not crypto |
| V14 Config / Build | yes | CDP write/exec is enabled **only** in the perf test project, never in the shipped package; `rollup-plugin-visualizer` is env-gated off by default; tachometer config excluded from `package.files`; CI perf/size jobs inherit the repo's read-only `permissions: contents: read` [VERIFIED: .github/workflows/ci.yml:10-11] |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Dev-only tool (visualizer/tachometer) leaks into the published tarball | Info disclosure / bloat | Keep in `devDependencies`; `package.files` stays `["dist","README.md"]`; env-gate visualizer |
| CDP write/exec broadening the test server's privilege | Elevation of privilege | Scope `allowWrite/allowExec` to the `perf` project only; never on the shipped build; CI job is read-only-permissioned |
| A perf/size "optimization" later silently changing the frozen surface | Tampering (freeze-violation) | Out of scope here (measure-only), but baselines seed the Phase-8+ guards; surface-diff gate untouched |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Slow-3G / Fast-3G throughput+latency constants (500 kbps/400 ms; 1.6 Mbps/150 ms) match Chromium DevTools canonical presets | Pattern 1 `NETWORK_TIERS` | Wrong tier numbers skew load metrics; low risk (tune from measured data; D-01 allows grid adjustment). Verify against Chromium/Playwright preset source in Wave 0. |
| A2 | `cdp()` write/exec gate is enabled via `test.browser.api.{allowWrite,allowExec}` at the project level | Pattern 1 config | If key path differs, `cdp()` fails; mitigated by the Wave-0 spike + custom-command fallback (`ctx.page...newCDPSession`). |
| A3 | Lit inlines the globals `reactiveElementVersions` / `litHtmlVersions` / `litElementVersions`, making them reliable dist grep markers for a bundled copy | Pitfall 4 / MEAS-04b | A wrong marker → false-negative no-Lit check. Mitigated by validating against a deliberately-bundled fixture in Wave 0; the `external`-list snapshot is an independent second guard. |
| A4 | `rollup-plugin-visualizer@7` exposes machine-readable data (JSON template) to assert `highlight.js` absence programmatically, not just an HTML treemap | MEAS-05 | If HTML-only, fall back to `size-limit --why` grep or a `dist` import-graph grep for `highlight.js`. Low risk (multiple attribution paths). |

**All four assumptions have a Wave-0 verification or an independent fallback; none blocks planning.**

## Open Questions (RESOLVED)

1. **Exact `cdp()` privilege key path (A2).**
   - Known: `cdp()` needs `allowWrite`+`allowExec`; playwright+chromium only.
   - Unclear: nesting in Vitest 4.1 config schema.
   - RESOLVED (Plan 07-00, Wave-1 spike): one-line spike pins + comments the key nesting; `ctx.page.context().newCDPSession(page)` custom-command fallback documented. De-risked before Plans 07-02/07-03 build on it.
2. **Marginal-cost mechanism (Discretion): size-limit `import` syntax vs per-entry-minus-core arithmetic.**
   - RESOLVED (Plan 07-01, Task 2): adopts the per-entry-minus-core arithmetic diff in `size-baseline.mjs` (fewer moving parts, brotli-consistent).
3. **Where the perf lane runs in CI: sibling `perf` job vs folded into `browser`.**
   - RESOLVED (Plan 07-06): sibling `perf` job (Node 20) isolates the write+exec CDP privilege and the Chromium-only constraint from the correctness lane; re-scoped `size` job stays Node 22.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node ≥22.18 (size lane) | size-limit 13 | ✓ (CI Node 22 job) | 22.x | — (size job already pinned) |
| Playwright Chromium | perf lane + browser lane | ✓ | ^1.62.1 | `npx playwright install chromium` (already in `browser` job) |
| `@vitest/browser-playwright` | `cdp()` bridge | ✓ | 4.1.9 | — |
| Node `zlib.brotliCompressSync` | standalone brotli | ✓ (built-in) | Node ≥12 | — |
| `rollup-plugin-visualizer` / `@size-limit/esbuild-why` / `tachometer` | MEAS-05 / D-10 | ✗ (to install) | 7.1.1 / 13.0.3 / 0.7.2 | none needed — install step |

**Missing dependencies with no fallback:** none (the three new dev packages are a single install step; all verified on npm this session).

## Sources

### Primary (HIGH confidence)
- Repo files read this session: `.planning/phases/07-.../07-CONTEXT.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`, `scripts/cem-diff.mjs`, `.github/workflows/ci.yml`, `.size-limit.json`, `vitest.config.ts`, `vite.config.ts`, `package.json`, `test/helpers.ts`, `test/browser/{floating-position,data-grid-virtual,overlay-focus}.test.ts`, `src/internal/controllers/floating-position.ts`, `api/custom-elements.baseline.json`
- `npm view` this session: rollup-plugin-visualizer 7.1.1, @size-limit/esbuild-why 13.0.3, tachometer 0.7.2

### Secondary (MEDIUM confidence)
- Vitest Browser Mode context/commands docs — `cdp()` signature + write/exec gating; custom command `ctx.page` — https://vitest.dev/api/browser/context , https://vitest.dev/api/browser/commands
- size-limit config (brotli default, `gzip`/`ignore`/`import` keys) — https://github.com/ai/size-limit
- Lit ReactiveElement lifecycle (update/updated/render overridable) — https://lit.dev/docs/api/ReactiveElement/
- STACK.md / PITFALLS.md (in-repo, HIGH but derivative) for tool selection + pitfall grounding

### Tertiary (LOW confidence / to verify in Wave 0)
- Slow-3G/Fast-3G numeric presets (A1); exact `allowWrite/allowExec` nesting (A2); Lit version-marker global names (A3); visualizer JSON output shape (A4)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified on npm this session; all reused tooling read from repo
- Architecture (CDP bridge, count instrumentation, JSON persistence): HIGH — mechanics confirmed against official docs + first-party chokepoints read in source
- Size-limit brotli/ignore re-scope: HIGH — config keys confirmed; current `.size-limit.json` read
- No-bundled-Lit marker specifics (A3) + `cdp()` privilege key (A2): MEDIUM — flagged with Wave-0 spikes and independent fallbacks
- Network tier constants (A1): MEDIUM — canonical values, tune from measured grid

**Research date:** 2026-08-22
**Valid until:** 2026-09-21 (30 days; Vitest 4.x browser API and size-limit 13 are current-stable)
