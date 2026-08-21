# Architecture Research

**Domain:** v1.1 Performance & Compatibility Hardening of a frozen-API Lit 3 / Web Components library (Amris), client-only ESM, no SSR
**Researched:** 2026-08-20
**Confidence:** HIGH (grounded in the actual repo: `vite.config.ts`, `package.json`, `.size-limit.json`, `vitest.config.ts`, `src/internal/`, and the 6 overlay import sites; framework behaviors verified against Lit 3 / floating-ui / @lit-labs/virtualizer docs)

## How to read this document

Every item is tagged along two axes the roadmapper needs:

- **NEW-internal** = a new file/module under `src/internal/` (or `scripts/` / config). Never re-exported from `src/index.ts` / `src/index.all.ts`, registers no custom element, so it CANNOT appear on the frozen CEM/public surface.
- **MODIFIED** = an edit to an existing component or shared file. Must be checked against the two freeze gates below.

Two freeze gates decide "surface-preserving vs needs-Changeset":

1. **CEM surface gate** (`scripts/cem-diff.mjs` vs `api/custom-elements.baseline.json`, enforcing since Phase 6): any change to tagName / attribute / property / event / slot / `::part` / CSS-prop surface trips it → needs a Changeset.
2. **Behavior gate** (the jsdom + browser test lanes + a11y axe scan): observable behavior — DOM output, focus order, event timing, validity — must not change.

An item is **surface-preserving** when it touches neither gate. Deferral/lazy-load and internal re-plumbing are surface-preserving by construction *as long as* the awaited work is invisible to the consumer (see the async-timing pitfall).

---

## Standard Architecture

### System Overview — where the v1.1 workstreams attach

```
┌──────────────────────────────────────────────────────────────────────┐
│  PUBLIC SURFACE (FROZEN — CEM baseline, no new API in v1.1)           │
│  src/index.ts (core, 40 exports) · src/index.all.ts (full, 67) ·      │
│  src/components/*/index.ts barrels · exports map · sideEffects        │
├──────────────────────────────────────────────────────────────────────┤
│  COMPONENTS  (60+ LitElements, Shadow DOM, static styles)             │
│   overlays        forms                lists/data                     │
│   combobox        input/select/…       data-grid                      │
│   select          (attachInternals)    combobox/select popups         │
│   dropdown popover│                    │                              │
│   tooltip date-pk │                    │                              │
│   context-menu    │                    │                              │
│        │          │                    │                              │
│   [W1 chokepoint] [W3 chokepoint]      [W1/W2 chokepoint]             │
│        │          │                    │                              │
├────────┼──────────┼────────────────────┼─────────────────────────────┤
│  src/internal/  (NON-EXPORTED boundary — the home for ALL v1.1 machinery)│
│   controllers/                     helpers/                           │
│    floating-position.ts  ◀─W1      teardown-scope.ts                  │
│    validation.ts         ◀─W3      virtualize-support.ts ◀─W1/W2      │
│    listbox-nav.ts                  date-utils / time-utils            │
│    shortcut-registry.ts            capabilities.ts      ◀─W3 [NEW]    │
│    option-filter.ts                lazy-load.ts         ◀─W1 [NEW]    │
├──────────────────────────────────────────────────────────────────────┤
│  RUNTIME DEPS (external, unbundled — resolved by consumer)            │
│   lit (peer) · @floating-ui/dom · @lit-labs/virtualizer · @lit/context│
├──────────────────────────────────────────────────────────────────────┤
│  BUILD + CI  (measure/gate — NOT shipped)                             │
│   Vite 8 lib(multi-entry) · Terser · minify-html-literals · cem       │
│   size-limit (.size-limit.json) · Vitest jsdom+browser · scripts/*.mjs│
│   perf-harness.mjs ◀─W4 [NEW] · size/perf CI budgets ◀─W4 [MODIFIED] │
└──────────────────────────────────────────────────────────────────────┘
```

**The critical structural fact for this milestone:** the Phase-2/3/4 `src/internal/` boundary already funnels every cross-cutting behavior through a *single* controller/helper per concern. That means each v1.1 workstream has **one chokepoint file**, not N component edits:

| Concern | Single chokepoint (already exists) | Fans out to |
|---------|-----------------------------------|-------------|
| Overlay positioning / floating-ui load | `src/internal/controllers/floating-position.ts` | combobox, select, dropdown, popover, tooltip, date-picker (6) |
| List virtualization / virtualizer load | `src/internal/helpers/virtualize-support.ts` | data-grid, combobox/select popups |
| Form validity display | `src/internal/controllers/validation.ts` | all form-associated controls |
| Form value participation | *(inline in each control today — NEW helper needed)* | ~14 form-associated controls |

This is the load-bearing insight: **W1 bundle-deferral and W3 form-fallback are mostly single-file edits to the internal boundary**, which keeps them surface-preserving and low-risk.

### Component Responsibilities (v1.1 additions)

| Component | Responsibility | Tag / freeze status |
|-----------|----------------|---------------------|
| `capabilities.ts` (NEW-internal) | One-time feature detection: `ElementInternals`, `adoptedStyleSheets`, `CSS.supports(':has')`, container queries, `ResizeObserver`. Memoized booleans. | No tag — surface-preserving |
| `lazy-load.ts` (NEW-internal) | Promise-memoized dynamic `import()` wrappers for `@floating-ui/dom` and `@lit-labs/virtualizer`; returns cached module after first load. | No tag — surface-preserving |
| `form-participation.ts` (NEW-internal) | Shared setFormValue/validity seam that routes through ElementInternals when present, else a hidden light-DOM `<input>` fallback. | No tag — surface-preserving |
| `perf-harness.mjs` (NEW, `scripts/`) | Build-time + Browser-Mode measurement: bundle bytes per entry, render/update timings under CPU throttle. Emits JSON baselines. | Not shipped — surface-preserving |
| `floating-position.ts` (MODIFIED) | Await `lazy-load` before first `computePosition`. Behavior identical once loaded. | Surface-preserving (behavior gate: async timing — see pitfall) |
| `virtualize-support.ts` (MODIFIED) | Dynamic-import the virtualizer at/above `VIRTUALIZE_ROW_THRESHOLD`. | Surface-preserving |
| form controls, e.g. `input.ts` (MODIFIED) | Call the shared `form-participation` seam instead of raw `this.internals.setFormValue`. | Surface-preserving IF public props/events unchanged |

## Recommended Project Structure

```
src/
├── internal/                          # NON-EXPORTED boundary — all v1.1 machinery lands here
│   ├── controllers/
│   │   ├── floating-position.ts       # MODIFIED (W1): dynamic-import floating-ui on first start()
│   │   └── validation.ts              # unchanged; pairs with form-participation for fallback msgs
│   └── helpers/
│       ├── capabilities.ts            # NEW-internal (W3): memoized feature-detection
│       ├── lazy-load.ts               # NEW-internal (W1): promise-memoized dynamic import()
│       ├── form-participation.ts      # NEW-internal (W3): ElementInternals-or-hidden-input seam
│       └── virtualize-support.ts      # MODIFIED (W1/W2): defer virtualizer import above threshold
├── components/                        # MODIFIED only at call sites; NO new props/events/slots
│   ├── input/ … (14 form controls)    #   route setFormValue via form-participation seam
│   └── data-grid/, combobox/ …        #   heaviest-first runtime tuning (W2)
scripts/
│   ├── perf-harness.mjs               # NEW (W4): browser-mode timing + byte measurement
│   ├── size-baseline.mjs              # NEW (W4): freeze current size-limit numbers as baseline
│   └── build-audit.mjs / cem-diff.mjs # existing measurement scripts — reuse the pattern
.size-limit.json                       # MODIFIED (W4): tighten limits from measured baseline
vitest.config.ts                       # MODIFIED (W4): add a 'perf' browser project OR reuse 'browser'
```

### Structure Rationale

- **`src/internal/helpers/` is the correct home for `capabilities.ts` and `lazy-load.ts`.** It already holds the non-component machinery (`teardown-scope`, `virtualize-support`) and is excluded from both entry barrels, so anything added there is invisible to the CEM by construction. Do NOT invent a new top-level folder — that would fragment the established freeze boundary.
- **One capability module, imported everywhere.** Feature detection scattered across components risks divergent guards and duplicated `typeof` checks in every chunk (bloating payload). A single memoized module tree-shakes to one copy and gives one place to test.
- **`lazy-load.ts` separate from `floating-position.ts`** so the same memoized-import pattern serves the virtualizer too, and so the dynamic-import boundary (which Rollup turns into a separate chunk) is explicit and testable.
- **Measurement lives in `scripts/` + `vitest` projects, not a parallel toolchain.** The repo already runs zero-dep ESM Node scripts (`build-audit.mjs`, `cem-diff.mjs`, `smoke-pack.mjs`) and a Playwright/Chromium browser project. Extend those, do not add Karma/Benchmark.js/webpack-bundle-analyzer.

## Architectural Patterns

### Pattern 1: Deferred dependency via memoized dynamic import at the internal chokepoint (W1)

**What:** Convert the top-of-file static `import { computePosition, autoUpdate, … } from '@floating-ui/dom'` in `floating-position.ts` into a dynamic `import()` performed lazily on the first `start()` (first overlay open), cached in a module-level promise so subsequent opens pay nothing.
**When to use:** Heavy deps used only after a user interaction (overlays open on click/focus; virtualizer engages only above a row threshold).
**Trade-offs:** (+) Removes `@floating-ui/dom` from the *initial* import graph of every overlay chunk — a consumer who only renders a closed tooltip never loads positioning math; per-component chunks stay independently shakeable because the dep moves behind an `import()` Rollup splits into its own chunk. (−) Introduces an `await` before first positioning; the overlay must render at a safe default position for one frame, then reposition — must be visually identical to today's first-paint (floating-ui's first `computePosition` is already async, so this is a *small* extension of existing async, not new behavior). (−) Adds a shared chunk (`chunks/floating-*.js`) — this is the intended dedupe (see Pattern 4), not bloat.

**Example:**
```typescript
// src/internal/helpers/lazy-load.ts  (NEW-internal, surface-preserving)
let floatingPromise: Promise<typeof import('@floating-ui/dom')> | null = null;
export function loadFloating() {
  return (floatingPromise ??= import('@floating-ui/dom'));
}

// floating-position.ts  start()  (MODIFIED — behavior-preserving once resolved)
async start() {
  this.stop();
  const { computePosition, autoUpdate, flip, shift, offset } = await loadFloating();
  const reference = this.opts.reference(); const floating = this.opts.floating();
  if (!reference || !floating) return;
  this._cleanup = autoUpdate(reference, floating, () => this._update(computePosition, …));
}
```
Note: `vite.config.ts` already marks `@floating-ui/dom` `external`, so it is not bundled today — but a *static* external import still forces the consumer's bundler to load it whenever the overlay chunk is imported. The win is moving it behind `import()` so it is fetched only on open. **Keep it `external`**; only the import *style* changes.

### Pattern 2: Threshold-gated deferral for the virtualizer (W1/W2)

**What:** `virtualize-support.ts` already gates virtualization on `VIRTUALIZE_ROW_THRESHOLD = 100`. Extend that: below the threshold, never import `@lit-labs/virtualizer`; at/above it, dynamic-import via `lazy-load.ts`. Small grids/lists (the common case) then carry zero virtualizer bytes.
**When to use:** Data-display components where the heavy path is the rare path.
**Trade-offs:** (+) data-grid deep-import (`.size-limit.json` budget 13 kB) drops for the common small-grid case. (−) First render of a large grid awaits the import; render a non-virtualized `repeat()` window first, then swap — must preserve the current a11y row indices (the file's `ariaRowindex`/`ariaPosinset` helpers already compute from absolute index, so this is safe). (−) Virtualizer pinned `2.1.1` (labs, exact) — dynamic import does not change the pin.

### Pattern 3: Capability-gated form participation with hidden-input fallback (W3)

**What:** Today each of the ~14 form controls does `this.internals = this.attachInternals()` in its constructor and `this.internals.setFormValue(value)` on change. Below Safari 16.4 `attachInternals` throws / `setFormValue` is absent, so the control silently fails to submit. Introduce `form-participation.ts`: detect `ElementInternals` support once (`capabilities.ts`); when present, behave exactly as today; when absent, append a hidden `<input>` in the control's **light DOM** and mirror `value`/`name`/`disabled` onto it so the native form still serializes the field.
**When to use:** Every form-associated control, behind the shared seam — no public prop/event/slot changes, so it stays surface-preserving.
**Trade-offs:** (+) Forms submit below the ElementInternals floor without a polyfill (which the constraints forbid). (+) One seam = one place to test the fallback. (−) The hidden input is in light DOM, so consumer CSS could theoretically see it — mitigate with `hidden`/`aria-hidden` + a reserved name; document that validity UI still degrades (native `setValidity` has no fallback — that limit is documented, not worked around). (−) Must guard against double-submission (both internals and hidden input) — the seam picks exactly one path per capability result.

**Example:**
```typescript
// src/internal/helpers/capabilities.ts  (NEW-internal, surface-preserving)
export const hasElementInternals =
  typeof HTMLElement !== 'undefined' &&
  typeof (HTMLElement.prototype as any).attachInternals === 'function' &&
  typeof (globalThis as any).ElementInternals !== 'undefined' &&
  'setFormValue' in ((globalThis as any).ElementInternals?.prototype ?? {});
export const hasAdoptedStyleSheets = 'adoptedStyleSheets' in Document.prototype;
export const supportsHas = typeof CSS !== 'undefined' && CSS.supports?.('selector(:has(*))');
```

### Pattern 4: Shared-runtime dedupe across entry points (W1)

**What:** With multiple entries (`amris.js`, `amris-core.js`, 60+ per-component chunks) each importing the internal controllers, ensure the deferred deps and shared controllers resolve to **one** shared chunk under `chunks/` rather than being inlined per entry. The `rollupOptions.output.chunkFileNames: 'chunks/[name]-[hash].js'` and the `sideEffects` allowlist (`./dist/chunks/**/*.js`) already anticipate this; a consumer importing several components then downloads floating-ui / the controllers once.
**When to use:** Always, for multi-entry libraries — verify with the harness, don't assume.
**Trade-offs:** (+) Two components sharing an overlay controller share its chunk. (−) Over-splitting creates many tiny chunks (HTTP/2 helps, but watch the count); the harness should report chunk count + per-chunk bytes so W4 can catch regressions. (−) Deep-import purity: a `./components/button` import must still NOT pull overlay/floating chunks — the `import()` boundary guarantees this because button never reaches `loadFloating()`.

### Pattern 5: CSS/token delivery — adoptedStyleSheets vs global tokens.css (W1/W3)

**What:** Components use Lit `static styles = css\`…\`` which Lit delivers via **Constructable/adoptedStyleSheets** — one `CSSStyleSheet` object shared across all instances of a component (memory + parse win on repeated components; central to runtime perf on low-end). The `dist/styles/tokens.css` global sheet is the alternative token channel for apps not using `<am-theme-provider>`.
**Compatibility angle (W3):** Lit already falls back to per-shadow-root `<style>` injection when `adoptedStyleSheets` is unsupported — so older engines keep working, but with higher memory (a style clone per instance). This is a *documented* degradation, not a code change. **Payload angle (W1):** trimming token delivery means auditing whether every component chunk re-embeds token declarations vs referencing `var(--am-*)` (it should reference, not redeclare). Do NOT hoist tokens into a global CSS cascade — that violates the Shadow-DOM constraint.
**Trade-offs:** (+) adoptedStyleSheets is the single biggest built-in runtime win and is free (Lit does it). (−) Guarding features like `:has()` / container queries inside `css\`\`` templates is the real compat risk — those fail silently in Shadow DOM on old engines; the W3 audit must find and provide fallbacks or accept the documented floor.

### Pattern 6: Behavior-preserving re-render reduction (W2)

**What:** Cut main-thread work in the heaviest components (data-grid, combobox, overlays) without changing output: (a) narrow `willUpdate`/`updated` to act only on the changed keys (`changed.has('x')`), (b) hoist `classMap`/style objects out of `render()` where inputs are stable, (c) ensure `repeat()` keys are stable so Lit's keyed diff reuses DOM, (d) confirm `live()` is only on genuinely two-way inputs (it forces a read every update), (e) gate `autoUpdate`/global listeners strictly on open transitions (already audited — keep enforcing).
**When to use:** Only where the harness (W4) shows a component exceeding the frame budget under CPU throttle — measure first.
**Trade-offs:** (+) Fewer reflows/GC on throttled CPUs. (−) Easy to change behavior accidentally (e.g. dropping a `live()` breaks external value overwrite) — every change is guarded by the browser test lane. Micro-optimizing cold components is wasted effort; the CONCERNS map already names data-grid full-re-render-on-sort and combobox filter-per-keystroke as the real hotspots.

## Data Flow

### Deferred-load flow (W1)

```
consumer imports <am-tooltip> chunk
    ↓  (floating-ui NOT in this chunk's static graph)
user hovers → tooltip.open = true → controller.start()
    ↓
loadFloating()  ──first call──▶  import('@floating-ui/dom')  →  chunks/floating-[hash].js
    ↓  (memoized promise; later opens resolve instantly)
computePosition + autoUpdate  →  position identical to v1.0
```

### Capability-gated form flow (W3)

```
control constructor
    ↓
capabilities.hasElementInternals ?
    ├─ yes → attachInternals() → setFormValue()/setValidity()   (v1.0 path, unchanged)
    └─ no  → append hidden <input> in light DOM, mirror value/name/disabled
                → native <form> serializes the field (validity UI degrades — documented)
```

### Measurement flow (W4)

```
vite build (existing)                     Vitest browser project (Playwright/Chromium)
    ↓                                          ↓  CDP: CPU 4–6× throttle, network Slow-3G
size-limit reads dist/*.js (gzip)         perf-harness renders data-grid/combobox/overlay
    ↓                                          ↓  performance.measure() around update cycles
size-baseline.json                        perf-baseline.json
    └────────────── CI compares current vs baseline; report-only → enforcing ──────────────┘
```

## Suggested Build Order (respects dependencies)

Ordering rule from PROJECT.md decisions: **measure before optimize; degradation guards before cross-engine test.**

1. **W4a — Measurement harness + baselines FIRST (NEW, surface-preserving).**
   Extend `.size-limit.json` into a captured `size-baseline.json`; add `scripts/perf-harness.mjs` running under the existing Vitest `browser` project with CDP CPU/network throttling; profile data-grid, combobox, overlays. *Nothing is optimized until there is a baseline* — this de-risks every later cut and picks the low-end target profile from real data. Gates start **report-only**.

2. **W3a — `capabilities.ts` feature-detection module (NEW-internal, surface-preserving).**
   Land the memoized detection module + tests before any degradation depends on it. No behavior change yet — pure infrastructure. (Comes before W1 because W1's CSS-payload audit and W3's fallbacks both consume it, and per the "guards before cross-engine test" rule.)

3. **W1 — Bundle-size deferral (MODIFIED at chokepoints, surface-preserving).**
   `lazy-load.ts` (NEW-internal) → convert `floating-position.ts` to deferred import → extend `virtualize-support.ts` threshold to defer the virtualizer. Verify shared-chunk dedupe and deep-import purity against the W4a baseline. (Depends on W4a to prove the byte win; independent of W3 except sharing `lazy-load`.)

4. **W3b — Form-participation fallback (NEW-internal + MODIFIED call sites, surface-preserving).**
   `form-participation.ts` seam (uses W3a) → route the ~14 controls' `setFormValue` through it → hidden-input fallback below the ElementInternals floor. Then the CSS/`:has()`/container-query audit for silent-failure guards. (Depends on W3a.)

5. **W2 — Runtime-perf tuning of heaviest components (MODIFIED, surface-preserving).**
   Only the components the W4a profile flagged (data-grid re-render-on-sort, combobox filter-per-keystroke, overlay reposition). Re-measure each change against the perf baseline. (Depends on W4a to target; after W1 so it measures the post-deferral graph.)

6. **W3c / cross-engine — Widen the tested-engine matrix (MODIFIED config, surface-preserving).**
   Add WebKit/Firefox instances to the Vitest `browser` project to prove the W3 degradation on real old-ish engines; document the true browser floor. (Must come after W3a/W3b guards exist — you cannot test degradation that is not yet built.)

7. **W4b — Flip gates to enforcing (MODIFIED config, surface-preserving).**
   Once baselines are trustworthy and gains banked, turn size + perf budgets from report-only to blocking — mirroring the v1.0 coverage-gate discipline. Last, so it locks in results instead of blocking in-progress work.

## Scaling Considerations

| Concern | Small consumer (1 component) | Typical (a dozen) | Heavy (full bundle, big data) |
|---------|------------------------------|-------------------|-------------------------------|
| Bundle bytes | deep-import + no overlay ⇒ no floating-ui (W1) | shared chunk downloaded once (Pattern 4) | full bundle; deferral still trims closed-overlay path |
| Runtime | trivial | fine | virtualization above 100 rows (W1/W2); re-render narrowing (W2) |
| Memory | adoptedStyleSheets shares one sheet/component | same | virtualizer windows DOM; watch listener/timer teardown (TeardownScope) |

### Scaling Priorities

1. **First bottleneck:** initial payload of overlay-using apps (floating-ui in every overlay chunk) → W1 deferral.
2. **Second bottleneck:** data-grid full re-render + all-rows DOM on large datasets under throttled CPU → W1 threshold deferral + W2 render narrowing.

## Anti-Patterns

### Anti-Pattern 1: Adding a public "lazy" / "virtualize" / "compat" attribute

**What people do:** Expose the optimization as a new prop (`<am-tooltip lazy>`, `<am-data-grid virtualize>`).
**Why it's wrong:** Any new attribute/property trips the CEM surface gate → breaks the freeze / needs a Changeset, and shifts the decision to the consumer. v1.1 is explicitly no-new-surface.
**Do this instead:** Make deferral/virtualization automatic and internal, gated on interaction or a measured threshold inside `src/internal/`.

### Anti-Pattern 2: Polyfilling ElementInternals or hoisting a global CSS reset

**What people do:** Pull in an ElementInternals shim, or fix old-engine styling by injecting a global stylesheet.
**Why it's wrong:** Constraints forbid both — ElementInternals is not polyfillable, and global CSS breaks Shadow-DOM encapsulation and dark-mode tokens.
**Do this instead:** Feature-detect (`capabilities.ts`) and degrade — hidden-input form participation, documented validity-UI limit, documented browser floor. Keep all styling in `--am-*` tokens.

### Anti-Pattern 3: Optimizing before measuring / a parallel toolchain

**What people do:** Guess hotspots, or bolt on webpack-bundle-analyzer + Benchmark.js beside the existing tools.
**Why it's wrong:** Blind cuts risk behavior regressions the freeze forbids; a second toolchain fragments CI.
**Do this instead:** Build W4a first; extend `size-limit` + the Vitest `browser` project + zero-dep `scripts/*.mjs` — the harness the repo already uses.

### Anti-Pattern 4: Treating highlight.js as a shipped-payload problem

**What people do:** Try to lazy-load `highlight.js` out of the component bundles.
**Why it's wrong:** `highlight.js` is a **devDependency used only in Storybook/docs** — it is not imported anywhere under `src/` and is not in `dependencies`, so it is already absent from every shipped chunk. Spending W1 effort on it is wasted; the real shipped heavy deps are `@floating-ui/dom` and `@lit-labs/virtualizer`. (If docs-site payload is a goal, defer it in Storybook config only — separate from the library.)

## Integration Points

### Runtime deps (all stay `external`/unbundled — only import *style* changes)

| Dep | Integration change | Freeze status |
|-----|--------------------|---------------|
| `@floating-ui/dom` | static → dynamic `import()` behind `lazy-load` at `floating-position.ts` | surface-preserving (behavior: async timing) |
| `@lit-labs/virtualizer` (pinned 2.1.1) | dynamic import above `VIRTUALIZE_ROW_THRESHOLD` | surface-preserving |
| `lit` (peer) | unchanged — must not bundle | n/a |
| `@lit/context` | unchanged | n/a |

### Internal boundaries

| Boundary | Communication | Freeze / new-vs-modified |
|----------|---------------|--------------------------|
| components → `floating-position.ts` | ReactiveController `start()/stop()` (unchanged API) | MODIFIED internal impl, surface-preserving |
| components → `virtualize-support.ts` | helper fns + threshold constant | MODIFIED internal, surface-preserving |
| form controls → `form-participation.ts` | NEW shared seam replacing raw `internals.setFormValue` | NEW-internal + MODIFIED call sites, surface-preserving |
| everything → `capabilities.ts` | memoized boolean imports | NEW-internal, surface-preserving |
| `floating-position` / `virtualize-support` → `lazy-load.ts` | memoized `import()` | NEW-internal, surface-preserving |
| build/CI → `perf-harness.mjs`, `size-baseline.mjs`, `.size-limit.json` | JSON baselines compared in CI | NEW/MODIFIED build, surface-preserving |
| CI → `cem-diff.mjs` (existing enforcing gate) | every code change re-runs it | the guardrail that PROVES surface-preservation |

### Freeze-preservation summary (every item)

| Item | New/Modified | Surface-preserving? | Needs Changeset? |
|------|--------------|---------------------|------------------|
| `capabilities.ts` | NEW-internal | Yes | No |
| `lazy-load.ts` | NEW-internal | Yes | No |
| `form-participation.ts` | NEW-internal | Yes | No |
| `perf-harness.mjs` / `size-baseline.mjs` | NEW (build) | Yes (not shipped) | No |
| `floating-position.ts` deferral | MODIFIED | Yes (behavior gate: async first-paint) | No, if identical after resolve |
| `virtualize-support.ts` deferral | MODIFIED | Yes | No |
| form controls → seam | MODIFIED | Yes, if no prop/event/slot change | No |
| W2 render narrowing | MODIFIED | Yes, if DOM/focus/events identical | No |
| `.size-limit.json` / vitest config | MODIFIED | Yes (CI only) | No |
| any new public attribute/prop (AVOID) | — | No | **Yes — do not do in v1.1** |

## Pitfalls specific to this milestone

1. **Async first-paint on deferred overlays** — the `await import()` adds a microtask before first positioning. Render the overlay at its default placement first, then reposition, exactly as floating-ui's already-async first `computePosition` does. Verify in the browser lane that no visible jump is introduced vs v1.0.
2. **Double form submission** — the `form-participation` seam must pick exactly one channel (internals XOR hidden input) per capability result, or a field serializes twice.
3. **Deep-import purity regression** — a refactor that makes `button` transitively reach `lazy-load`/floating chunks would silently reintroduce the dep into light chunks. The W4 harness must assert per-chunk graphs, not just total bytes.
4. **Virtualizer swap breaking a11y row indices** — the existing `ariaRowindex`/`ariaPosinset` compute from absolute index, so keep using them when swapping non-virtualized ↔ virtualized rendering; never recompute from mounted-node count.
5. **`:has()` / container-query silent failure in Shadow DOM** — these fail quietly on old engines; the W3 audit must enumerate their use inside `css\`\`` blocks and either provide fallbacks or fold them into the documented floor.

## Sources

- Repo (HIGH — primary): `vite.config.ts` (multi-entry lib, `external` deps, chunk naming), `package.json` (`exports`, `sideEffects`, deps vs devDeps — confirms highlight.js is dev-only), `.size-limit.json` (current budgets), `vitest.config.ts` (jsdom + Playwright/Chromium browser projects), `src/internal/controllers/floating-position.ts` + `helpers/virtualize-support.ts` + `controllers/validation.ts` (chokepoint controllers), `src/components/input/input.ts` (attachInternals/setFormValue sites), `scripts/build-audit.mjs` (zero-dep measurement-script pattern), `.planning/PROJECT.md` + `.planning/codebase/CONCERNS.md` (frozen-surface decisions, named hotspots).
- Lit 3 docs (HIGH): `static styles` → adoptedStyleSheets with per-shadow-root `<style>` fallback; ReactiveController lifecycle.
- floating-ui docs (HIGH): `computePosition` is Promise-based; `autoUpdate` cleanup contract.
- `@lit-labs/virtualizer` 2.1.1 (HIGH — verified in `virtualize-support.ts` JSDoc against node_modules): `virtualize()` directive, `virtualizerRef`, absolute-index render, flow layout.

---
*Architecture research for: v1.1 Performance & Compatibility Hardening of a frozen-API Lit 3 Web Components library*
*Researched: 2026-08-20*
