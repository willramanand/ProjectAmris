# Phase 8: Bundle-Size Deferral - Research

**Researched:** 2026-08-22
**Domain:** Memoized dynamic-`import()` deferral of heavy runtime deps (`@floating-ui/dom`, `@lit-labs/virtualizer`) in a frozen-API Lit 3 / Web Components library, client-only ESM, verified against the re-scoped brotli size metric — behavior- AND surface-preserving.
**Confidence:** HIGH (all mechanics grounded in files opened this session: the controller, virtualize-support, the 8 floating-ui import sites, vite/size-limit/vitest config, the Phase-7 measurement scripts and baselines)

## Summary

This phase moves two already-`external` heavy deps from the **synchronous** import graph of every overlay/data entry into **async chunks** loaded on demand, so first-load payloads shrink and the win becomes visible in Phase-7's re-scoped brotli metric. The work is almost entirely a handful of edits inside the `src/internal/` chokepoint boundary plus routing six component import sites through a new shared memoized loader — it never touches the frozen CEM surface `[VERIFIED: 08-CONTEXT.md D-06, ARCHITECTURE.md:62-72]`.

The three real risks are all documented in the milestone Pitfalls and locked by CONTEXT decisions: (1) the `await import()` seam inserting a `0,0` paint frame or focus-order race on slow networks — mitigated by **prefetch-on-intent + hidden-until-positioned** (D-01/D-02); (2) `virtualize()` running inside `render()` where it cannot be `await`ed — mitigated by **prefetch + `repeat()` cold/failure fallback** (D-04/D-05); (3) a chunking/`external` slip bundling or duplicating Lit — guarded by the existing report-only no-bundled-Lit assertions (D-10). A fourth, subtler risk this research surfaces: **color-picker currently positions one-shot with NO `autoUpdate`**, so migrating it onto `FloatingPositionController` (which always runs `autoUpdate`) would be a behavior change — route it through the shared loader instead, not the controller.

**Primary recommendation:** Build one `src/internal/helpers/lazy-load.ts` module-level promise-memoized loader; convert `floating-position.ts` and `virtualize-support.ts` to consume it; change the controller's `middleware` option to receive the loaded floating-ui module so hosts (combobox/select `size`, popover/tooltip `arrow`) drop their static `import`; route rich-select onto the controller and color-picker through the loader directly; add a runtime registration-smoke test + extend the no-bundled-Lit assertion; prove the win via the brotli baseline delta + a deep-import purity assertion. Add NO `manualChunks` tuning (that is `PERF-V2-01`, deferred).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Prefetch the floating-ui chunk on trigger intent (`pointerenter`/`focus`), then `await` the usually-resolved promise on open; preserves the open→position→focus→autoUpdate ordering contract. Reversible.
- **D-02:** `hidden-until-positioned` is LOCKED — overlays stay `visibility:hidden`/unpainted until the first `computePosition` resolves, then reveal. Never paint at `0,0`. Non-negotiable regardless of prefetch timing.
- **D-03:** Prefetch is on trigger intent for ALL overlays (uniform policy). Hover overlays (tooltip, popover) warm on trigger `pointerenter`/`focus`; trigger menus (dropdown, select, combobox, color-picker, rich-select) warm on the same. A wasted hover-fetch is accepted cost.
- **D-04:** Prefetch the virtualizer chunk near-threshold / on grid-popup open, so the directive is usually resolved by the `render()` that needs it. `virtualize()` runs inside `render()` and cannot be `await`ed.
- **D-05:** `repeat()` is BOTH the cold-cross gap render AND the offline/fetch-failure fallback. On successful load the render swaps to `virtualize()`. Fully behavior-preserving for correctness; free failure mode. Reversible.
- **D-06:** Full deferral — route EVERY runtime floating-ui site through ONE shared, memoized deferred loader (`src/internal/helpers/lazy-load.ts`, NEW). `FloatingPositionController` loads `computePosition`/`autoUpdate`/`flip`/`shift`/`offset`; combobox/select (`size`) and popover/tooltip (`arrow`) obtain host-specific middleware from the SAME loaded module; migrate color-picker and rich-select off their inline `computePosition` so no component holds a static floating-ui import. Result: floating-ui absent from every non-overlay entry, living in one shared chunk. Costly to reverse; all changes MUST be behavior-preserving (surface-diff gate + real-browser positioning tests are the guard).
- **D-07:** `dropdown` imports only `type Placement` (type-only, erased at build) — no runtime change; leave it. Verify it stays type-only after the refactor.
- **D-08:** SIZE-05 bounded scope — mostly satisfied by D-01…D-06 (dynamic imports move the heaviest non-critical work off first paint) PLUS a targeted sweep of only the heaviest components to move ResizeObserver/MutationObserver + non-essential listener attach off the construction/first-paint path. Document the discipline. Deliberately NOT a broad every-component audit. Reversible.
- **D-09:** Scheduling mechanism = interaction-gate + rAF/microtask. NO `requestIdleCallback` (Safari 16.4 floor does not support it). Interaction-gate + rAF is portable, no capability branch, matches existing `autoUpdate`-on-open gating discipline.
- **D-10:** SIZE-03 pinned by research + Pitfalls 3/5 — add a runtime registration-smoke assertion (import a component, assert `customElements.get('am-…')` is defined) AND reuse/extend the Phase-7 no-bundled-Lit assertion (independent of size-limit, which `ignore`s `lit`). Exact test file/harness location is Claude's discretion, following `api/` + `scripts/` + browser-lane conventions.

### Claude's Discretion

- Exact shape/name of the shared deferred loader (research suggests `src/internal/helpers/lazy-load.ts`) — the memoization strategy (module-level promise cache), and how the controller exposes the loaded module's middleware factories to hosts.
- Precise prefetch wiring per component (which existing trigger listener to hang `pointerenter`/`focus` prefetch off of) — behavior-preserving.
- Whether SIZE-04 dedupe verification uses `manualChunks` inspection, the bundle-attribution report (`rollup-plugin-visualizer` / `@size-limit/esbuild-why`), or a deep-import purity assertion. Do NOT add `manualChunks` tuning unless the chunk graph shows duplication deep-import purity can't resolve (that is `PERF-V2-01`, deferred).
- Which "heaviest components" get the D-08 idle-init sweep — pick from the measured Phase-7 baseline, keep the list short.

### Deferred Ideas (OUT OF SCOPE)

- `manualChunks` shared-runtime dedupe tuning → `PERF-V2-01` (future). Only if the post-deferral chunk graph shows cross-entry duplication that deep-import purity alone cannot resolve. Not a default.
- Flipping size/count budgets to enforcing → Phase 11 (GATE-01/02/03). This phase's win posts report-only.
- Runtime-perf tuning (re-render-on-sort, filter-per-keystroke, reposition churn) → Phase 9 (RPERF-01…04), measured against this phase's post-deferral baseline.
- Broad every-component idle-init audit — out of scope per D-08; only the heaviest components get the bounded sweep.
- Consumer-facing lazy-load as public API — out of scope (REQUIREMENTS): deferral stays an internal optimization, no new public entry points.
- Deferring `highlight.js` — Storybook-only devDep, already absent from every shipped chunk (Pitfall 7). Do NOT add any "defer highlight.js" work.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIZE-01 | `@floating-ui/dom` loads via memoized dynamic `import()` gated on first overlay open (`floating-position.ts`); all 6 overlays behavior-preserving; positioning absent from non-overlay entries. | Pattern 1 loader shape (§Architecture Patterns); the 8 import sites mapped (§Standard Stack / floating-ui sites); prefetch+hidden-until-positioned (Pitfall F1); deep-import purity proof (§Validation SIZE-01/04). |
| SIZE-02 | `@lit-labs/virtualizer` loads via memoized dynamic `import()` at/above the row threshold (`virtualize-support.ts`); data-grid + combobox/select popups behavior-preserving. | Pattern 2 render-time deferral (§Architecture Patterns); `virtualize()` cannot be awaited → prefetch + `repeat()` fallback + reactive re-render (Pitfall V1). |
| SIZE-03 | Tree-shaking canary proves an imported component still calls `customElements.define` at runtime and Lit is never bundled. | Registration-smoke test design + extend existing no-bundled-Lit assertion (§Code Examples, §Validation SIZE-03); no such canary exists today (verified). |
| SIZE-04 | Shared-chunk dedupe + per-component deep-import purity verified — no cross-entry duplication regressions. | Deep-import purity assertion over `dist/**`; bundle-attribution report reuse; NO manualChunks (§Architecture Patterns Pattern 3, §Validation SIZE-04). |
| SIZE-05 | Non-critical component init deferred off first-load critical path (idle/deferred init), behavior-preserving. | Bounded sweep of heaviest components; interaction-gate + rAF/microtask, no `requestIdleCallback` (§Architecture Patterns Pattern 4, §Common Pitfalls SIZE-05). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dynamic-import loader (floating-ui, virtualizer) | Internal helper (`src/internal/helpers/lazy-load.ts`) | Browser/bundler (`import()` chunk split) | Non-exported machinery — invisible to CEM by construction `[CITED: ARCHITECTURE.md:111]` |
| Overlay positioning + autoUpdate lifecycle | Internal controller (`floating-position.ts`) | Component (host `start()`/`stop()`) | Single chokepoint already fans out to 6 overlays `[VERIFIED: floating-position.ts:85-131]` |
| Middleware supply (`size`, `arrow`) | Component (host) via controller | Loaded floating-ui module | Host-specific; must come from the loaded module, not a static import (D-06) |
| Threshold-gated virtualization | Internal helper (`virtualize-support.ts`) | Component `render()` (`virtualize()` directive) | Threshold constant + ARIA helpers already centralized `[VERIFIED: virtualize-support.ts:66-117]` |
| Deferred/idle non-critical init | Component construction/first-paint path | Browser scheduling (rAF/microtask) | Interaction-gate + rAF, no `requestIdleCallback` (D-09) |
| Size/chunk verification | Build + CI (size-limit, visualizer, node scripts) | — | Not shipped; report-only this phase `[VERIFIED: package.json:59-86, ci.yml]` |

## Standard Stack

No new packages are introduced this phase. Every tool needed already exists in `package.json` `[VERIFIED: package.json:87-115]`.

### Core (already installed — the deps being deferred)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@floating-ui/dom` | `^1.7.6` (dependency) | Overlay positioning (`computePosition`/`autoUpdate` + `flip`/`shift`/`offset`/`size`/`arrow` middleware) | Already the library's positioning engine; stays `external` `[VERIFIED: package.json:88, vite.config.ts:241]` |
| `@lit-labs/virtualizer` | `2.1.1` **exact-pinned** | `virtualize()` directive for large lists (data-grid, combobox/select popups) | Pre-1.0 labs — a minor bump can break the runtime API; deferral changes import timing only, never the pin `[VERIFIED: package.json:89; virtualize-support.ts:39-41]` |
| `lit` | `^3.3.2` (peer) | Framework — MUST stay external/unbundled | Peer dep; a second copy breaks reactive-controller/directive identity `[VERIFIED: package.json:116-118; PITFALLS.md:107-124]` |

### Supporting (measurement/verification — already installed devDeps)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `size-limit` + `@size-limit/preset-small-lib` | `^13.0.3` | Per-entry brotli measurement; async chunks excluded from an entry's initial size (that exclusion IS the win) | Prove SIZE-01/02 byte delta via `npm run size` / `size:baseline` `[VERIFIED: package.json:96-108,77-79]` |
| `@size-limit/esbuild-why` | `^13.0.3` | Attribute which module pulls bytes into an entry | `npm run size:why` — SIZE-04 attribution `[VERIFIED: package.json:96,79]` |
| `rollup-plugin-visualizer` | `^7.1.1` | Emit `bundle-stats.json` (raw-data) gated behind `VISUALIZE=1` | SIZE-04 chunk-graph attribution; feeds `attribution-check.mjs` `[VERIFIED: vite.config.ts:5-25; package.json:107]` |
| `vitest` + `@vitest/browser-playwright` + `playwright` | `4.1.x` / `^1.62.1` | jsdom lane + Chromium browser lane + throttled perf lane | SIZE-01/03 behavior + no-`0,0`-frame + registration-smoke `[VERIFIED: vitest.config.ts:39-107; package.json:100,106,114]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Module-level promise cache in `lazy-load.ts` | Per-instance loader / re-import each open | Per-instance loses memoization → repeated network/parse; module-level is the standard "load once, cache promise" pattern `[CITED: ARCHITECTURE.md:126-130]` |
| Deep-import purity assertion (new node script) | `manualChunks` tuning | manualChunks tuning is explicitly deferred (`PERF-V2-01`); purity assertion proves absence without touching the chunk strategy (D-06 discretion) |
| Extend the existing browser lane for registration-smoke | New standalone tool | Reuse the established `test/` + Vitest project convention (D-10); no new toolchain `[CITED: ARCHITECTURE.md:114]` |

**Installation:** none — no packages added.

**Version verification:** All packages are already resolved in `package-lock.json`; the only versions that matter to this phase are the two being deferred, both already pinned/ranged in `package.json` and unchanged by this work `[VERIFIED: package.json:88-89]`.

## Package Legitimacy Audit

> This phase installs **no external packages**. All deps used (the two being deferred, plus size-limit/visualizer/vitest tooling) are already present in `package.json` and were vetted in prior phases. No legitimacy check is required.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| (none added) | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       ┌─────────────────────────────────────────────┐
 consumer imports a    │  NON-OVERLAY ENTRY (e.g. button, input)     │
 component chunk  ───▶  │  static graph: NO @floating-ui/dom          │  ◀── SIZE-01 purity target
                       └─────────────────────────────────────────────┘

                       ┌─────────────────────────────────────────────┐
 consumer imports an   │  OVERLAY ENTRY (popover/tooltip/select/…)   │
 overlay chunk    ───▶  │  static graph: controller + host, NO fl-ui  │
                       └───────────────┬─────────────────────────────┘
                                       │ user hovers/focuses trigger (D-01/D-03)
                                       ▼
                       prefetch ─▶ loadFloating() ──first call──▶ import('@floating-ui/dom')
                                       │  (module-level promise cache)      │
                                       │                                    ▼
                                       │                        chunks/floating-[hash].js  ◀── ONE shared chunk (SIZE-04)
                                       ▼
 user opens ─▶ controller.start() ─▶ await loadFloating() (usually resolved)
                                       │
                       hidden-until-positioned (D-02): floating stays visibility:hidden
                                       ▼
                       computePosition(...) resolves ─▶ write left/top ─▶ REVEAL ─▶ focus ─▶ autoUpdate
                                                                        (never paints at 0,0)

                       ┌─────────────────────────────────────────────┐
 large list render ──▶ │  data-grid / combobox / select render()     │
 (rows ≥ 100)          │  virtualize() needs the directive NOW       │
                       └───────────────┬─────────────────────────────┘
                          prefetch near-threshold / on popup-open (D-04)
                                       │ chunk resolved?
                        ┌──────────────┴───────────────┐
                    yes │                               │ no (cold cross / fetch failure)
                        ▼                               ▼
                  virtualize({...})              repeat(...)  ◀── D-05 fallback, fully functional (unwindowed)
                        ▲                               │
                        └──── requestUpdate() on chunk resolve ──┘
```

### Recommended Project Structure

```
src/internal/
├── helpers/
│   ├── lazy-load.ts          # NEW — module-level promise-memoized import() for both deps
│   └── virtualize-support.ts # MODIFIED — defer @lit-labs/virtualizer above threshold + prefetch
└── controllers/
    └── floating-position.ts  # MODIFIED — await loadFloating() in start(); pass module to middleware getter
src/components/
├── combobox/ select/         # MODIFIED — drop `import {size}`; middleware from loaded module; prefetch wiring
├── popover/ tooltip/         # MODIFIED — drop `import {arrow}`; middleware from loaded module; prefetch wiring
├── color-picker/             # MODIFIED — route inline computePosition through lazy-load (NOT the controller)
├── rich-select/              # MODIFIED — migrate onto FloatingPositionController (has autoUpdate already)
└── dropdown/                 # UNCHANGED — verify `type Placement` stays type-only (D-07)
test/
├── browser/                  # registration-smoke + no-0,0-frame under throttle (new specs)
└── perf/                     # existing overlay/data-grid scenarios re-measured for before/after delta
scripts/
└── (new) deep-import-purity check + extend assert-no-bundled-lit.mjs / attribution-check.mjs
```

### Pattern 1: Memoized dynamic-import loader at the internal chokepoint (SIZE-01)

**What:** A module-level promise cache. First caller triggers `import()`; every later caller awaits the same resolved promise (zero repeat cost). The controller awaits it before the first `computePosition`; the `middleware` option changes to receive the loaded module so hosts never statically import `size`/`arrow`.

**When to use:** Heavy deps used only after an interaction (overlays open on click/focus).

**Trade-offs:** (+) Removes `@floating-ui/dom` from the *synchronous* graph of every overlay chunk → size-limit stops counting it in the entry's initial size (the provable win) `[VERIFIED: size-baseline.mjs:11-14 — floating-ui NOT in any ignore list]`. (−) Inserts an `await` before first positioning → mitigated by D-01 prefetch + D-02 hidden-until-positioned. (−) Adds a shared `chunks/floating-*.js` — intended dedupe, not bloat.

**Key integration detail (Claude's discretion, resolved here):** The controller's current `middleware?: Resolvable<Middleware[]>` option `[VERIFIED: floating-position.ts:54]` must change so the getter receives the loaded floating-ui module (or its factories). Popover/tooltip already use a getter form `middleware: () => this.arrowEl ? [arrow({...})] : []` `[VERIFIED: popover.ts:65-66; tooltip.ts:61]`; combobox/select use a static array with `sizeMiddleware(...)` at field-init `[VERIFIED: combobox.ts:160-168; select.ts:274-289]`. Because the array is evaluated at construction (before the module loads), combobox/select must move to the getter form too, receiving `size` from the loaded module. This is an internal controller-API change — surface-preserving, no CEM impact.

### Pattern 2: Render-time deferral for the virtualizer via prefetch + reactive re-render (SIZE-02)

**What:** `virtualize()` runs inside `render()` and cannot be `await`ed `[VERIFIED: data-grid.ts:516; combobox.ts:722; select.ts:992]`. So: (a) prefetch the virtualizer chunk near-threshold / on popup-open (D-04); (b) in `render()`, if the loaded directive is available, call `virtualize({...})`; else render the existing `repeat()` path (D-05 — this is BOTH the cold-cross gap render AND the offline/fetch-failure fallback); (c) when the prefetch promise resolves, call `this.requestUpdate()` so Lit re-renders and swaps to `virtualize()`.

**When to use:** Data-display components where the heavy path is the rare path (≥ `VIRTUALIZE_ROW_THRESHOLD = 100`) `[VERIFIED: virtualize-support.ts:66]`.

**Trade-offs:** (+) Small grids/lists carry zero virtualizer bytes; data-grid deep-import (10848 brotli baseline) drops for the common case `[VERIFIED: size.baseline.json:8]`. (−) Above threshold, the very first render is unwindowed `repeat()` for one frame, then swaps — behavior-preserving because the ARIA row/pos helpers compute from the ABSOLUTE index, identical in both paths `[VERIFIED: virtualize-support.ts:73-94; ARCHITECTURE.md:147,327]`. (−) `virtualizerRef`/`scrollVirtualizerToIndex` no-op when no virtualizer is attached yet, so callers stay safe during the fallback window `[VERIFIED: virtualize-support.ts:103-117]`.

### Pattern 3: Shared-chunk dedupe + deep-import purity WITHOUT manualChunks (SIZE-04)

**What:** Rollup already turns each dynamic `import()` into its own chunk and names chunks `chunks/[name]-[hash].js` `[VERIFIED: vite.config.ts:245]`; `sideEffects` already allowlists `./dist/chunks/**/*.js` `[VERIFIED: package.json:56]`. The single shared `lazy-load.ts` boundary means floating-ui resolves to ONE shared chunk across all overlay entries. Verify — do not tune — via: (1) the brotli baseline delta (`size-baseline.mjs`), (2) `size:why` / `VISUALIZE=1` attribution, (3) a NEW deep-import purity assertion that greps each non-overlay component's `dist` static graph for `@floating-ui/dom` and asserts absence, and that floating-ui appears only behind a dynamic `import()`.

**When to use:** Always for this phase's verification. **Do NOT add `manualChunks`** — that is `PERF-V2-01`, deferred, and only warranted if purity alone cannot resolve a duplication `[VERIFIED: 08-CONTEXT.md:204-206; REQUIREMENTS.md:73]`.

**Trade-offs:** (+) Zero chunk-strategy risk (Pitfall 6 over-splitting avoided). (−) Purity assertion must parse the static import graph correctly (reuse `collectImportSpecifiers` from `assert-no-bundled-lit.mjs`) `[VERIFIED: assert-no-bundled-lit.mjs:78-90]`.

### Pattern 4: Bounded idle/deferred non-critical init (SIZE-05)

**What:** For the few heaviest components (pick from the Phase-7 baseline — combobox and data-grid are the measured hotspots `[VERIFIED: perf.baseline.json:18-49]`), move ResizeObserver/MutationObserver attach and non-essential global listeners off the constructor/first-paint path onto: an **interaction-gate** (attach on first open/focus, mirroring the existing `autoUpdate`-on-open discipline) or a **double-`requestAnimationFrame`/microtask** for "after first paint" work. **No `requestIdleCallback`** — unsupported at the Safari 16.4 floor (D-09).

**When to use:** Only the heaviest components; document the discipline; do NOT do a broad audit (D-08).

**Trade-offs:** (+) Faster slow-network first paint. (−) Every deferral touches a frozen-behavior component → keep the list short and guard with the browser lane + surface-diff gate.

### Anti-Patterns to Avoid
- **Adding a public `lazy`/`virtualize` attribute** — trips the CEM surface gate; deferral must be automatic and internal `[CITED: ARCHITECTURE.md:261-265]`.
- **`sideEffects:false` "to shake harder"** — tree-shakes away `@customElement` registration → consumer sees unstyled unknown elements `[CITED: PITFALLS.md:61-79]`.
- **`await import()` on OPEN instead of prefetch on INTENT** — causes the `0,0` flash + focus-order race on slow networks `[CITED: PITFALLS.md:85-98]`.
- **Migrating color-picker onto `FloatingPositionController`** — the controller always runs `autoUpdate`; color-picker positions one-shot with none (see Pitfall CP1). Route it through the loader instead.
- **Dropping `@floating-ui/dom` from the vite `external` array during the refactor** — bundles/duplicates Lit-adjacent deps; the frozen `external` snapshot test guards it `[VERIFIED: no-bundled-lit.test.ts:67-74]`.
- **Adding `manualChunks`** — deferred to `PERF-V2-01`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Load-once caching of a dynamic import | A bespoke per-call fetch/cache with locks | `promise ??= import(...)` module-level cache | Standard idiom; the `??=` naturally dedupes concurrent callers `[CITED: ARCHITECTURE.md:126-130]` |
| Positioning + autoUpdate lifecycle | New per-component position code | Existing `FloatingPositionController` | Already gates autoUpdate on open, mirrors teardown on disconnect `[VERIFIED: floating-position.ts:94-114]` |
| Virtualized ARIA indices during fallback swap | Recompute from mounted-node count | Existing `ariaPosinset`/`ariaRowindex`/`ariaSetsize` (absolute-index) | Truthful across recycling AND across the repeat↔virtualize swap `[VERIFIED: virtualize-support.ts:73-94]` |
| No-bundled-Lit proof | New grep from scratch | Extend `scripts/assert-no-bundled-lit.mjs` + `test/no-bundled-lit.test.ts` | Marker set + external-array snapshot already exist `[VERIFIED: assert-no-bundled-lit.mjs:41-45; no-bundled-lit.test.ts:60-74]` |
| Brotli before/after delta | New size measurement | `scripts/size-baseline.mjs` (`--write`/`--check`) | Already computes per-entry + marginal brotli, report-only `[VERIFIED: size-baseline.mjs:66-80]` |
| Bundle attribution | Add webpack-bundle-analyzer | `VISUALIZE=1` visualizer + `size:why` + `attribution-check.mjs` | Already wired, gated behind env flag `[VERIFIED: vite.config.ts:5-25; package.json:79,82]` |

**Key insight:** The `src/internal/` chokepoint boundary means this whole phase is a handful of internal-file edits plus call-site rewiring — the reusable machinery (controller, virtualize helpers, measurement scripts, Lit guards) already exists; do not rebuild any of it.

## Runtime State Inventory

> This phase is a behavior-preserving code refactor, not a rename/data migration. No stored data, live-service config, OS-registered state, or secrets are touched. One build-artifact category applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys/collections/user_ids involved | none |
| Live service config | None — no external service configuration references the changed code | none |
| OS-registered state | None — no scheduled tasks / process names involved | none |
| Secrets/env vars | None runtime. The `VISUALIZE=1` build flag is dev-only and already documented `[VERIFIED: vite.config.ts:7-13]` | none |
| Build artifacts | Chunk graph changes: floating-ui/virtualizer move to `chunks/*` async chunks; `dist/**` hashes shift. Committed baselines (`api/size.baseline.json`, `api/perf.json`) will drift and must be re-`--write`n as part of the phase. `custom-elements.json` MUST NOT change (surface-diff gate). | Re-write size + perf baselines; run `diff:surface` to confirm CEM unchanged `[VERIFIED: package.json:65,78,80; size.baseline.json]` |

## Common Pitfalls

### Pitfall F1: Deferred floating-ui → `0,0` flash + focus-order race (SIZE-01)
**What goes wrong:** `await import()` on open inserts a microtask/network gap; the overlay paints at viewport `0,0` for one+ frames, or focus/`autoUpdate` reorder ahead of first position `[VERIFIED: PITFALLS.md:85-98]`.
**Why:** Overlays have an ordering contract (open→position→focus→autoUpdate) that a promise seams.
**How to avoid:** D-01 prefetch on trigger `pointerenter`/`focus`; D-02 keep the floating element `visibility:hidden` until first `computePosition` resolves, then reveal; start `autoUpdate` AFTER first position (already the controller's structure `[VERIFIED: floating-position.ts:101-103]`).
**Warning signs:** Overlay "jumps" into place on first open; focus test flakes after adding `await`; screenshot diff on overlay open on a throttled profile.

### Pitfall CP1: color-picker has NO autoUpdate — migrating it onto the controller is a behavior change (SIZE-01)
**What goes wrong:** `FloatingPositionController.start()` always wraps positioning in `autoUpdate` `[VERIFIED: floating-position.ts:101-103]`. But color-picker positions **one-shot** — `updated()` calls `if (this._open) this._updatePosition()` and `_updatePosition` is a single `await computePosition(...)` with **no `autoUpdate`** `[VERIFIED: color-picker.ts:317-322,535-543]`. Routing it through the controller would add a continuous reposition loop = observable behavior change (and new `computePosition` call counts).
**Why:** D-06 says "migrate off inline `computePosition` onto the controller / shared loader" — the "/ shared loader" branch is the correct one for color-picker.
**How to avoid:** Route color-picker's inline `computePosition`/`flip`/`offset`/`shift` through `loadFloating()` directly (drop the static `import`), preserving its exact one-shot positioning. Reserve full controller migration for **rich-select**, which already runs `autoUpdate` with `size` middleware `[VERIFIED: rich-select.ts:370-373,452-463]` and whose middleware stack (`offset(4)→flip()→shift({padding:8})→size`) matches the controller defaults `[VERIFIED: floating-position.ts:121-127]`.
**Warning signs:** color-picker panel repositions on scroll/resize where it previously did not; perf harness shows new reposition counts for color-picker.

### Pitfall V1: `virtualize()` cannot be awaited inside `render()` (SIZE-02)
**What goes wrong:** A naive `await import()` in `render()` is impossible — `render()` is synchronous; forgetting the fallback throws or renders nothing above the threshold on a cold chunk.
**How to avoid:** D-04 prefetch + D-05 `repeat()` fallback + `requestUpdate()` on resolve (Pattern 2). Assert the list is fully functional (just unwindowed) during the fallback window and swaps to `virtualize()` after load.
**Warning signs:** Blank list above 100 rows on first open on a slow network; `virtualizerRef` undefined errors.

### Pitfall L1: Chunking/`external` slip bundles or duplicates Lit (SIZE-03)
**What goes wrong:** An `external` regression pulls `lit`/`@lit-labs/*` into `dist`; size-limit `ignore`s `lit` so the size gate stays green while bytes balloon `[VERIFIED: PITFALLS.md:107-124; .size-limit.json:5,11,17,23,31]`.
**How to avoid:** Keep the `external` array byte-identical (the snapshot test guards it `[VERIFIED: no-bundled-lit.test.ts:67-74]`); run the dist-grep no-bundled-Lit assertion `[VERIFIED: assert-no-bundled-lit.mjs:98-121]`. Both stay report-only this phase (D-10).
**Warning signs:** `amris.js` grows but size gate green; `reactiveElementVersions`/`litHtmlVersions`/`litElementVersions` markers appear in `dist/**`.

### Pitfall SE1: `sideEffects` change shakes away registration (SIZE-03)
**What goes wrong:** Narrowing `sideEffects` drops a component import whose only effect was `customElements.define` → consumer's `<am-select>` renders as an unstyled unknown element; the CEM still lists it (no diff catch) `[VERIFIED: PITFALLS.md:61-79]`.
**How to avoid:** Do NOT touch `sideEffects` unnecessarily; add the registration-smoke test (D-10) — import a component, assert `customElements.get('am-…')` is defined at runtime.
**Warning signs:** Bundle shrinks more than expected after a `sideEffects` edit; consumer sees raw tags / `HTMLUnknownElement`.

### Pitfall SIZE5-1: `requestIdleCallback` used for deferred init (SIZE-05)
**What goes wrong:** `requestIdleCallback` is unavailable at the Safari 16.4 floor → the deferred init never fires there, or needs a capability branch.
**How to avoid:** D-09 — interaction-gate + rAF/microtask only. Portable, no branch.
**Warning signs:** A `requestIdleCallback` call in a component; init that never runs on WebKit.

## Code Examples

### Memoized loader (`src/internal/helpers/lazy-load.ts`, NEW-internal)
```typescript
// Source: ARCHITECTURE.md:126-130 (pattern) — module-level promise cache
let floatingPromise: Promise<typeof import('@floating-ui/dom')> | null = null;
export function loadFloating() {
  return (floatingPromise ??= import('@floating-ui/dom'));
}
export function prefetchFloating(): void { void loadFloating(); } // fire-and-forget on intent (D-01)

let virtualizerPromise: Promise<typeof import('@lit-labs/virtualizer/virtualize.js')> | null = null;
export function loadVirtualizer() {
  return (virtualizerPromise ??= import('@lit-labs/virtualizer/virtualize.js'));
}
export function prefetchVirtualizer(): void { void loadVirtualizer(); } // near-threshold / popup-open (D-04)
```

### Controller: await loader, pass module to middleware getter (`floating-position.ts`, MODIFIED)
```typescript
// start(): await the (usually prefetched) module before first position — preserves stop()→autoUpdate order
async start(): Promise<void> {
  this.stop();
  const mod = await loadFloating();                 // { computePosition, autoUpdate, flip, shift, offset, size, arrow }
  const reference = this.opts.reference();
  const floating = this.opts.floating();
  if (!reference || !floating) return;
  this._cleanup = mod.autoUpdate(reference, floating, () => this._updatePosition(mod, reference, floating));
}
// middleware option becomes: middleware?: (mod) => Middleware[]  — host builds size/arrow from the loaded module
// e.g. popover: middleware: (mod) => this.arrow && this.arrowEl ? [mod.arrow({ element: this.arrowEl })] : []
// e.g. combobox: middleware: (mod) => [mod.size({ apply({ rects, elements }) { /* width match */ } })]
```
Note: `start()` becoming `async` is internal — hosts already call it fire-and-forget on their open transition `[VERIFIED: popover.ts:188; select.ts:594; combobox.ts:514]`. Keep `@floating-ui/dom` `external` — only the import *style* changes `[CITED: ARCHITECTURE.md:141]`.

### Virtualizer swap with fallback (`data-grid`/`combobox`/`select` render path, MODIFIED)
```typescript
// prefetch near threshold (D-04):
if (total >= VIRTUALIZE_ROW_THRESHOLD) prefetchVirtualizer();
// in render() — D-05 fallback:
return this._virtualize                              // set from loadVirtualizer().then(m => { this._virtualize = m.virtualize; this.requestUpdate(); })
  ? this._virtualize({ items, renderItem, ... })
  : repeat(items, keyFn, renderItem);                // fully functional, unwindowed
```

### Registration-smoke test (SIZE-03, new browser/jsdom spec)
```typescript
// Import a component module for its side effect, then assert it registered at runtime.
import '../../src/components/select/select';
it('imported component still calls customElements.define (registration not shaken away)', () => {
  expect(customElements.get('am-select')).toBeDefined();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `import '@floating-ui/dom'` at top of controller + 5 components | Memoized dynamic `import()` behind one shared loader | This phase | floating-ui leaves every overlay entry's synchronous graph → measurable brotli win |
| combobox/select static `sizeMiddleware(...)` array at field-init | `size` from the loaded module via middleware getter | This phase | No static floating-ui import in any host |
| color-picker/rich-select inline `computePosition` | color-picker → loader; rich-select → controller | This phase | Zero static floating-ui imports remain in components |
| `virtualize` statically imported in data-grid/combobox/select | Deferred import + `repeat()` fallback + `requestUpdate` on resolve | This phase | Small lists carry zero virtualizer bytes |

**Deprecated/outdated:**
- `requestIdleCallback` for deferred init — excluded by the Safari 16.4 floor (D-09).
- Treating `highlight.js` as a shipped-payload problem — it is a Storybook-only devDep, absent from every chunk (Pitfall 7) `[VERIFIED: package.json:104 (devDependencies); PITFALLS.md:146-161]`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | size-limit v13 excludes async (`import()`) chunks from an entry's measured initial size, so deferral shows as a reduction in the `full bundle` / overlay entries. | Standard Stack / Validation | If size-limit followed the async chunk, the brotli delta would be near-zero and SIZE-01's win would need a different metric (e.g. a dedicated first-load composite excluding the async chunk). Verify empirically by building once and running `size:baseline --check` after the deferral. |
| A2 | The measured `.size-limit.json` entries that currently carry floating-ui synchronously are the **full bundle** (and any overlay in core) — the two deep-import entries measured today are `button` (no overlay) and `data-grid` (virtualizer only), neither of which imports floating-ui. | Validation SIZE-01 | If no measured entry carries floating-ui, the win is invisible in the current metric set. Recommendation: add a report-only overlay deep-import entry (e.g. `dist/components/popover/index.js` or `select`) to `.size-limit.json` so the SIZE-01 delta is legible. `[VERIFIED: .size-limit.json entries are core/full/button/data-grid/first-load-composite]` — the ASSUMED part is whether adding an overlay entry is in-scope vs. Phase-7-owned. |
| A3 | Making `FloatingPositionController.start()` `async` does not break any host that assumes synchronous completion of `start()`. | Code Examples | A host that reads positioned coordinates synchronously after `start()` would regress. Verified none do at the call sites read (`popover.ts:188`, `select.ts:594`, `combobox.ts:514`, `tooltip.ts:139`, `dropdown.ts:123`, `date-picker.ts:337` all call it fire-and-forget), but the two migrations (rich-select, and the hidden-until-positioned reveal wiring) must be checked during planning. |
| A4 | Changing the controller's `middleware` option signature from `Resolvable<Middleware[]>` to a module-receiving getter is surface-preserving (internal controller API, not CEM). | Pattern 1 | Correct unless some external consumer imports the controller — it is under `src/internal/`, non-exported, so this is safe `[VERIFIED: floating-position.ts:75-76 JSDoc "registers no custom element … never appears on the frozen CEM"]`. Low risk. |

## Open Questions (RESOLVED)

1. **Which `.size-limit.json` entry demonstrates the SIZE-01 win?**
   - What we know: floating-ui is now counted (not ignored); `full bundle` includes all overlays; `button`/`data-grid` deep-imports do not import floating-ui `[VERIFIED: .size-limit.json; size-baseline.mjs:11-14]`.
   - What's unclear: whether the `full bundle` delta alone is a sufficiently legible proof, or whether a report-only overlay deep-import entry should be added.
   - Recommendation: add a report-only `popover` or `select` deep-import entry to make the SIZE-01 "positioning absent from non-overlay entries" claim directly measurable, AND rely on the deep-import purity assertion (SIZE-04) as the primary absence proof. Confirm the metric choice with the planner; keep it report-only (no enforcing until Phase 11).
   - **RESOLVED:** Add the report-only overlay deep-import entry — 08-01 Task 3 adds a `"popover (overlay deep import)"` entry pointing at `dist/components/popover/index.js` (with `ignore:["lit"]`, a comfortable non-red limit) to `.size-limit.json`, kept report-only (no enforcing until Phase 11). The re-written `api/size.baseline.json` records the brotli drop on the overlay/`full bundle` entries as the legible SIZE-01 win, while SIZE-04 deep-import purity remains the primary absence proof.

2. **Does deferring `start()` require the reveal to move inside the resolved promise?**
   - What we know: D-02 hidden-until-positioned is locked; today the overlays reveal after `computePosition` writes `left/top` `[VERIFIED: floating-position.test.ts waits for panel.style.left/top]`.
   - What's unclear: exact per-component reveal wiring (CSS `visibility` toggle timing) given the new `await` — each overlay's open path differs.
   - Recommendation: plan a per-overlay check that the reveal is gated on first-position, verified by the no-`0,0`-frame browser test under throttle.
   - **RESOLVED:** Yes — the reveal stays gated on the first `computePosition` writing `left/top` (hidden-until-positioned, D-02); no overlay paints before position resolves inside the awaited loader promise. Each overlay gets its own per-overlay no-0,0-frame browser spec that verifies this across the async loader gap: 08-01 Task 2 (`overlay-no-zero-frame.test.ts`, popover), 08-02 (`overlay-no-zero-frame-tooltip.test.ts` + `overlay-no-zero-frame-color-picker.test.ts`), and 08-03 (`overlay-no-zero-frame-rich-select.test.ts`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node (build + scripts) | build, size-limit, node scripts | ✓ (repo standard) | Node 20 CI; size job pinned ≥22.18 | Documented split — keep size job on its own Node `[VERIFIED: PITFALLS.md:359]` |
| Chromium (Playwright) | browser + perf lanes | ✓ installed in CI | `playwright ^1.62.1` | none — required for no-`0,0`-frame + registration-smoke `[VERIFIED: ci.yml:47-51,107-113]` |
| `@floating-ui/dom` / `@lit-labs/virtualizer` | the deps being deferred | ✓ in package-lock | `^1.7.6` / `2.1.1` | none — already present `[VERIFIED: package.json:88-89]` |

**Missing dependencies with no fallback:** none — all tooling exists.
**Missing dependencies with fallback:** none.

## Validation Architecture

> Nyquist validation is enabled (`workflow.nyquist_validation` not disabled). This section is what plan-phase consumes to build VALIDATION.md.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.0` — three projects: `jsdom` (logic), `browser` (Chromium fidelity), `perf` (Chromium throttled) `[VERIFIED: vitest.config.ts:41-107]` |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --project jsdom` (logic) |
| Full suite command | `npx vitest run` (all projects) + `npm run build` + `npm run size` + `npm run diff:surface` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIZE-01 | floating-ui deferred; 6 overlays position identically; no `0,0` frame + correct focus under throttle | browser (Chromium, throttled) | `npm run test:browser` (extend `floating-position.test.ts`, `overlay-focus.test.ts`) + new no-`0,0`-frame spec | ✅ base exists / ❌ no-`0,0` spec — Wave 0 |
| SIZE-01 | positioning code absent from non-overlay entries | build + node script | new `deep-import-purity` script over `dist/**` | ❌ Wave 0 |
| SIZE-01 | brotli win visible | build + size | `npm run build && node scripts/size-baseline.mjs --check` | ✅ script exists; re-`--write` baseline `[VERIFIED: package.json:78]` |
| SIZE-02 | virtualizer deferred; data-grid/combobox/select popups behave identically; `repeat()` fallback works | browser | `npm run test:browser` (extend `data-grid-virtual.test.ts`, `combobox-virtual.test.ts`, `virtualize-smoke.test.ts`) | ✅ base exists; add cold-chunk/fallback assertions — Wave 0 |
| SIZE-03 | imported component still `customElements.define`s at runtime | jsdom + browser | new registration-smoke spec (`customElements.get('am-…')`) | ❌ Wave 0 (no canary exists — verified) |
| SIZE-03 | Lit never bundled | jsdom + build | `node scripts/assert-no-bundled-lit.mjs` + `npx vitest run test/no-bundled-lit.test.ts` | ✅ both exist; report-only `[VERIFIED: package.json:81; no-bundled-lit.test.ts]` |
| SIZE-04 | shared-chunk dedupe + deep-import purity | build + node script | `VISUALIZE=1 npm run build && npm run attribution:check` + `size:why` + new purity assertion | ✅ attribution wired; ❌ purity assertion — Wave 0 |
| SIZE-05 | non-critical init deferred, behavior-preserving | browser + perf | `npm run test:browser` (a11y/behavior unchanged) + `npm run test:perf` before/after counts | ✅ perf lane exists; add behavior guards — Wave 0 |
| all | CEM surface unchanged | build + node script (enforcing) | `npm run diff:surface` | ✅ enforcing gate exists `[VERIFIED: ci.yml:80-81]` |
| all | overlay/data before-after perf delta | perf (Chromium throttled) | `npm run test:perf && node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json` | ✅ exists; re-baseline post-deferral `[VERIFIED: package.json:75,80; perf.baseline.json]` |

### Sampling Rate
- **Per task commit:** `npx vitest run --project jsdom` (fast logic + registration-smoke jsdom half) + `npm run diff:surface` after any component edit.
- **Per wave merge:** `npm run test:browser` (positioning/focus/no-`0,0`-frame) + `npm run build && npm run size && node scripts/size-baseline.mjs --check`.
- **Phase gate:** full suite green + `npm run test:perf` before/after delta recorded + `assert-no-bundled-lit` + purity assertion clean (all report-only) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `test/browser/*-no-zero-frame.test.ts` — asserts overlay never paints at `0,0` and focus lands correctly, under CDP throttle (SIZE-01, Pitfall F1).
- [ ] `test/…/registration-smoke.test.ts` — imports a component, asserts `customElements.get('am-…')` defined (SIZE-03, D-10; no canary exists today).
- [ ] `scripts/deep-import-purity.mjs` (or a jsdom test) — asserts non-overlay `dist` graphs contain no `@floating-ui/dom` and it appears only behind `import()` (SIZE-04); reuse `collectImportSpecifiers` from `assert-no-bundled-lit.mjs`.
- [ ] Extend `data-grid-virtual`/`combobox-virtual`/`virtualize-smoke` browser specs with a cold-chunk `repeat()` fallback assertion (SIZE-02, D-05).
- [ ] Re-`--write` `api/size.baseline.json` and `api/perf.json` after the deferral (build-artifact drift); confirm `custom-elements.json` unchanged.
- [ ] (Recommended, OQ-1) Add a report-only overlay deep-import entry to `.size-limit.json` to make the SIZE-01 delta legible.

## Security Domain

> `security_enforcement` is not disabled in config; this section applies. This phase is an internal refactor with no auth/session/crypto surface — most ASVS categories are N/A, but two threats are live for dynamic imports.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (no new external input) | Templating stays Lit-safe — no `innerHTML`/`eval` in any fallback path `[VERIFIED: CLAUDE.md security constraint; PITFALLS.md:376]` |
| V6 Cryptography | no | — |
| V12/V14 Config & Build (supply chain) | yes | Dynamic `import()` specifiers must resolve via the consumer's bundler (bare/relative) — NO hardcoded CDN/origin `[VERIFIED: PITFALLS.md:378]` |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Deferred chunk loaded from a wrong/relative base in a consumer bundler → 404 or unexpected origin | Tampering / DoS | Use bare/relative dynamic-import specifiers only; keep deps `external` so the consumer's bundler resolves them `[VERIFIED: PITFALLS.md:378; ARCHITECTURE.md:286-293]` |
| A fallback path reintroducing `innerHTML` for a degraded render | Tampering (XSS) | Keep the `repeat()` fallback and all rendering in Lit templates; no `innerHTML`/`eval` `[VERIFIED: PITFALLS.md:376]` |
| `sideEffects`/`external` slip bundling Lit or shaking registration | Tampering (integrity of shipped artifact) | No-bundled-Lit assertion + registration-smoke + frozen `external` snapshot `[VERIFIED: assert-no-bundled-lit.mjs; no-bundled-lit.test.ts]` |

## Project Constraints (from CLAUDE.md)

- **ESM-only, no CommonJS/UMD; no global CSS** — deferral uses `import()` (ESM), touches no global stylesheet.
- **Lit 3 peer dependency, never bundled** — keep `lit`/`@lit/*`/`@lit-labs/*` `external`; guard with no-bundled-Lit assertion.
- **Lit-safe templating only — no `innerHTML`/`eval`** — the `repeat()` fallback and all render paths stay in Lit templates.
- **All styling via `--am-*` tokens, no hardcoded colors** — no styling changes this phase; hidden-until-positioned uses `visibility`, not color.
- **Browser floor Safari 16.4 (ElementInternals not polyfillable)** — no `requestIdleCallback` (D-09); no capability workaround.
- **Property→event, no-global-state model** — the module-level promise cache is a load cache, not component state; components stay stateless per the architecture.
- **Frozen v1.0 CEM — behavior- AND surface-preserving; no `[CS]` items in Phase 8** — every edit is internal/behavior-preserving; `diff:surface` is the enforcing guardrail `[VERIFIED: REQUIREMENTS.md:10,132; ci.yml:80-81]`.

## Sources

### Primary (HIGH confidence — files opened this session)
- `src/internal/controllers/floating-position.ts` — controller shape, `middleware` option, autoUpdate gating.
- `src/internal/helpers/virtualize-support.ts` — threshold constant, ARIA helpers, `virtualizerRef`, verified v2.1.1 API.
- The 8 floating-ui import sites: `color-picker.ts`, `combobox.ts`, `dropdown.ts` (type-only), `popover.ts`, `rich-select.ts`, `tooltip.ts`, `select.ts`, plus the controller.
- The 3 `virtualize()` render sites: `data-grid.ts:516`, `combobox.ts:722`, `select.ts:992`.
- `vite.config.ts` (external array, chunk naming, VISUALIZE gate), `.size-limit.json`, `package.json` (deps, sideEffects, scripts), `vitest.config.ts` (3 projects), `scripts/size-baseline.mjs`, `scripts/assert-no-bundled-lit.mjs`, `test/no-bundled-lit.test.ts`, `api/size.baseline.json`, `api/perf.baseline.json`, `test/perf/overlay.perf.test.ts`, `test/perf/harness.ts`, `test/browser/floating-position.test.ts`, `.github/workflows/ci.yml`.
- `.planning/research/PITFALLS.md`, `.planning/research/ARCHITECTURE.md`, `.planning/phases/08-bundle-size-deferral/08-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md`, `SUMMARY.md`, `FEATURES.md` (referenced via CONTEXT canonical_refs, not re-opened this session — supporting context).

### Tertiary (LOW confidence)
- size-limit async-chunk exclusion behavior (A1) — inferred from size-limit's initial-load-size model; must be confirmed empirically after the first deferred build.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; the two deferred deps and all tooling verified in `package.json`.
- Architecture (loader shape, middleware wiring, migrations): HIGH — every import site and the controller opened and mapped; the color-picker no-autoUpdate finding is verified from source.
- Pitfalls: HIGH — grounded in milestone PITFALLS.md + verified against the real open paths.
- Validation: HIGH — the test lanes, scripts, and baselines all exist and were read; gaps are enumerated.
- The one MEDIUM/LOW item is A1 (size-limit async-chunk accounting), flagged for empirical confirmation.

**Research date:** 2026-08-22
**Valid until:** ~2026-09-21 (stable internal APIs; re-check if `@floating-ui/dom`/`@lit-labs/virtualizer` or size-limit major versions change)
