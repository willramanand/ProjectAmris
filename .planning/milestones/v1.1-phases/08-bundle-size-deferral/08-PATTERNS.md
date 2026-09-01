# Phase 8: Bundle-Size Deferral - Pattern Map

**Mapped:** 2026-08-22
**Files analyzed:** 13 (1 new source, 1 new-ish loader, 6 component edits, 1 helper, 1 controller, config + tests)
**Analogs found:** 12 / 13 (only `lazy-load.ts` is genuinely net-new machinery, and even it mirrors an established `??=` idiom)

This phase is a behavior- AND surface-preserving internal refactor. Every file being touched already exists except `src/internal/helpers/lazy-load.ts` (new) and the new test specs. The dominant pattern is: **route a static `import '@floating-ui/dom'` / `import '@lit-labs/virtualizer'` through a memoized dynamic-`import()` loader, keeping the exact existing positioning/render behavior.** No CEM/public-surface change.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/internal/helpers/lazy-load.ts` (NEW) | utility (internal helper) | event-driven (load-on-intent) | `src/internal/helpers/virtualize-support.ts` (threshold-gated internal helper, no CEM) | role-match (idiom is new but boundary + JSDoc conventions mirror it) |
| `src/internal/controllers/floating-position.ts` (MOD) | controller (reactive) | request-response (async positioning) | itself (in-place edit) — `_updatePosition` already `async` | exact |
| `src/internal/helpers/virtualize-support.ts` (MOD) | utility (internal helper) | transform (render-time directive) | itself (in-place edit) | exact |
| `src/components/combobox/combobox.ts` (MOD) | component (form/overlay) | event-driven + transform | `src/components/rich-select/rich-select.ts` (also has size mw) | exact (same middleware shape) |
| `src/components/select/select.ts` (MOD) | component (form/overlay) | event-driven + transform | `src/components/combobox/combobox.ts` | exact |
| `src/components/popover/popover.ts` (MOD) | component (overlay) | event-driven | `src/components/tooltip/tooltip.ts` | exact (both `arrow` getter) |
| `src/components/tooltip/tooltip.ts` (MOD) | component (overlay) | event-driven | `src/components/popover/popover.ts` | exact |
| `src/components/color-picker/color-picker.ts` (MOD) | component (overlay) | request-response (one-shot position) | `src/components/rich-select/rich-select.ts` `_updatePosition` (inline computePosition) | role-match (route through loader, NOT controller) |
| `src/components/rich-select/rich-select.ts` (MOD) | component (form/overlay) | event-driven | `src/components/select/select.ts` (controller + size mw) | exact (migration target) |
| `src/components/data-grid/data-grid.ts` (MOD) | component (data display) | transform (virtualize render) | `src/components/combobox/combobox.ts:717-733` (`_renderOptionList` repeat/virtualize swap) | exact |
| `.size-limit.json` (MOD) | config | batch (measurement) | itself (add report-only overlay entry) | exact |
| `vite.config.ts` (MOD, if needed) | config | batch (build) | itself (external array is frozen — DO NOT edit) | exact |
| `scripts/deep-import-purity.mjs` + registration-smoke spec (NEW) | test | batch (build/CI assertion) | `scripts/assert-no-bundled-lit.mjs` + `test/no-bundled-lit.test.ts` | exact (reuse `collectImportSpecifiers`) |

## Shared Patterns

### The memoized loader (the one net-new idiom every deferral routes through)
**Source (to CREATE):** `src/internal/helpers/lazy-load.ts` — pattern from RESEARCH.md:280-293, idiom from `virtualize-support.ts` JSDoc conventions.
**Apply to:** `floating-position.ts`, `virtualize-support.ts`, `color-picker.ts`, and (indirectly, via the controller/getter) combobox/select/popover/tooltip/rich-select.

```typescript
let floatingPromise: Promise<typeof import('@floating-ui/dom')> | null = null;
export function loadFloating() {
  return (floatingPromise ??= import('@floating-ui/dom'));
}
export function prefetchFloating(): void { void loadFloating(); } // fire-and-forget on trigger intent (D-01)

let virtualizerPromise: Promise<typeof import('@lit-labs/virtualizer/virtualize.js')> | null = null;
export function loadVirtualizer() {
  return (virtualizerPromise ??= import('@lit-labs/virtualizer/virtualize.js'));
}
export function prefetchVirtualizer(): void { void loadVirtualizer(); } // near-threshold / popup-open (D-04)
```
**Conventions to mirror from `virtualize-support.ts` (lines 1-42):** top-of-file JSDoc stating "registers no custom element … never appears on the frozen CEM/public surface"; note the deps stay `external` via the `vite.config.ts` pattern; keep the module under `src/internal/helpers/`, never re-exported from `src/index.ts`.

### Keep deps `external` — never touch the frozen array
**Source:** `vite.config.ts:241` — `external: ['lit', /^lit\//, /^@lit\//, /^@lit-labs\//, '@floating-ui/dom', /^@floating-ui\//]`
**Apply to:** all edits. This array is snapshot-frozen by `test/no-bundled-lit.test.ts:68-76` (byte-exact `expect(entries).toEqual([...])`). Do NOT reorder/drop/alter it. The deferral changes *when* deps load (`import()` timing), never *whether* they're bundled. Chunk naming already exists at `vite.config.ts:245` (`chunkFileNames: 'chunks/[name]-[hash].js'`) — dynamic imports auto-split into `chunks/*`; add NO `manualChunks` (PERF-V2-01, deferred).

### No-bundled-Lit + purity assertion harness
**Source:** `scripts/assert-no-bundled-lit.mjs` — reuse `collectImportSpecifiers(code)` (lines 78-90) and `collectDistJs(dir)` (lines 52-57), `stripCommentNoise` (65-69).
**Apply to:** new `scripts/deep-import-purity.mjs` (SIZE-04) — grep each non-overlay component's `dist` static graph, assert `@floating-ui/dom` is absent from static `from`/side-effect imports and appears ONLY behind `import('...')`. Mirror the **report-only exit-0** discipline (lines 161-172): print offenders, `process.exit(0)` this phase, usage error exits 2. Enforcing flip is Phase 11.

### Report-only registration-smoke (SIZE-03)
**Source pattern:** RESEARCH.md:322-329; harness convention from `test/no-bundled-lit.test.ts` (vitest jsdom lane).
**Apply to:** new spec — `import '../../src/components/select/select';` then `expect(customElements.get('am-select')).toBeDefined();`. Guards against a `sideEffects` tree-shake dropping `@customElement` registration (Pitfall SE1).

---

## Pattern Assignments

### `src/internal/controllers/floating-position.ts` (controller, request-response) — MODIFIED

**Analog:** itself. The lifecycle structure (start→stop→autoUpdate→computePosition) is preserved; only the import source becomes deferred.

**Current static import to REMOVE** (lines 1-12):
```typescript
import {
  computePosition, autoUpdate, flip, shift, offset,
  type Middleware, type MiddlewareData, type Placement, type Strategy,
} from '@floating-ui/dom';
```
Keep the `type`-only imports (erased at build); the *runtime* symbols (`computePosition`, `autoUpdate`, `flip`, `shift`, `offset`) move to the loaded module.

**`start()` becomes `async`, awaits the (usually-prefetched) module** (current lines 94-104). Hosts already call `start()` fire-and-forget on their open transition (`popover.ts:188`, `select.ts:594`, `combobox.ts:514`) so this is surface-safe. Preserve the `this.stop()` guard and the `if (!reference || !floating) return;` early-out:
```typescript
async start(): Promise<void> {
  this.stop();
  const mod = await loadFloating();
  const reference = this.opts.reference();
  const floating = this.opts.floating();
  if (!reference || !floating) return;
  this._cleanup = mod.autoUpdate(reference, floating, () => this._updatePosition(mod, reference, floating));
}
```

**`_updatePosition` uses the loaded module's factories** (current lines 116-130 — keep the exact `offset→flip→shift` base stack and `?? 4` / `?? 'bottom-start'` / `?? []` defaults):
```typescript
private async _updatePosition(mod, reference, floating): Promise<void> {
  const strategy = resolve(this.opts.strategy);
  const { x, y, placement, middlewareData } = await mod.computePosition(reference, floating, {
    placement: resolve(this.opts.placement) ?? 'bottom-start',
    ...(strategy ? { strategy } : {}),
    middleware: [ mod.offset(resolve(this.opts.offset) ?? 4), mod.flip(), mod.shift({ padding: 8 }),
      ...(resolve(this.opts.middleware) ?? []) ],
  });
  Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
  this.opts.onPositioned?.({ x, y, placement, middlewareData });
}
```

**Middleware option signature change** (current line 54: `middleware?: Resolvable<Middleware[]>`): change to a getter that RECEIVES the loaded module, so hosts build `size`/`arrow` from `mod.size`/`mod.arrow` instead of a static import — e.g. `middleware?: (mod: typeof import('@floating-ui/dom')) => Middleware[]`. This is an internal controller-API change (the controller is under `src/internal/`, non-exported per its JSDoc lines 74-76) — no CEM impact.

**D-02 hidden-until-positioned:** the reveal must be gated on the first `computePosition` resolving (currently reveals after `left/top` are written). Per Open Question 2, verify per-overlay reveal wiring so no `0,0` frame appears with the new `await`.

---

### `src/internal/helpers/virtualize-support.ts` (utility, transform) — MODIFIED

**Analog:** itself. Keep `VIRTUALIZE_ROW_THRESHOLD = 100` (line 66), the ARIA helpers (`ariaPosinset`/`ariaSetsize`/`ariaRowindex` lines 73-94), and `scrollVirtualizerToIndex` (110-117) unchanged.

**Current static import to defer** (line 44):
```typescript
import { virtualizerRef, type VirtualizerHostElement } from '@lit-labs/virtualizer/virtualize.js';
```
`virtualizerRef` is a runtime symbol used only inside `scrollVirtualizerToIndex` — that function is already a no-op when no virtualizer is attached (lines 104-106 JSDoc). The `virtualize` directive itself is imported at the render sites (below), which move to `loadVirtualizer()`. Consider exposing a helper that resolves `virtualizerRef` from the loaded module, or keep the symbol import type-only where possible. Do NOT bump the exact `2.1.1` pin (lines 39-41).

---

### `src/components/combobox/combobox.ts` + `select/select.ts` (component, event-driven + transform) — MODIFIED

**Analog:** each other. Both hold a static `size`/`sizeMiddleware` import AND a `virtualize()` render site.

**Static imports to REMOVE:** `combobox.ts:5-6` (`virtualize`, `size as sizeMiddleware`); `select.ts:3-4` (`size`, `virtualize`).

**Controller `middleware` array → getter receiving the module.** Current combobox field-init (lines 154-169) evaluates `sizeMiddleware(...)` at construction — BEFORE the module loads. Move to the getter form (matching popover/tooltip's getter style):
```typescript
// BEFORE (combobox.ts:160-168): middleware: [ sizeMiddleware({ apply({rects,elements}) {...} }) ]
// AFTER: middleware: (mod) => [ mod.size({ apply({ rects, elements }) {
//   Object.assign(elements.floating.style, { width: `${rects.reference.width}px` }); } }) ]
```

**Virtualize render swap** — combobox `_renderOptionList` (lines 717-733) is the canonical repeat↔virtualize pattern for D-05:
```typescript
if (filtered.length > VIRTUALIZE_ROW_THRESHOLD) {
  return this._virtualize
    ? this._virtualize({ items: filtered, keyFunction: (o) => o,
        renderItem: (o, i) => this._renderOption(o, i, filtered.length) })
    : repeat(filtered, o => o, (o, i) => this._renderOption(o, i, filtered.length)); // D-05 cold/failure fallback
}
```
Set `this._virtualize` via `loadVirtualizer().then(m => { this._virtualize = m.virtualize; this.requestUpdate(); })`, prefetched on popup-open near threshold (D-04). Select's equivalent site is `select.ts:990-992`.

**Prefetch wiring (D-01/D-03):** hang `prefetchFloating()` off the existing trigger `pointerenter`/`focus` listener; `prefetchVirtualizer()` near threshold / on popup open.

---

### `src/components/popover/popover.ts` + `tooltip/tooltip.ts` (component, event-driven) — MODIFIED

**Analog:** each other. Both already use the **getter middleware form** — the least invasive migration.

**Static import to REMOVE:** `popover.ts:3` / `tooltip.ts:3` (`arrow`; keep `type Placement`).

**Getter already receives no arg today** (popover.ts:65-66): `middleware: () => this.arrow && this.arrowEl ? [arrow({ element: this.arrowEl })] : []`. Change to receive the module: `middleware: (mod) => this.arrow && this.arrowEl ? [mod.arrow({ element: this.arrowEl })] : []`. `onPositioned` arrow-readback (popover.ts:67-69) is unchanged.

**Prefetch (D-03):** tooltip/popover warm `prefetchFloating()` on their trigger `pointerenter`/`focus`.

---

### `src/components/rich-select/rich-select.ts` (component, event-driven) — MODIFIED (full controller migration)

**Analog:** `src/components/select/select.ts` (controller + `size` middleware getter). rich-select already runs `autoUpdate` + `size` with the SAME middleware stack the controller defaults to.

**Current inline positioning to REPLACE:** `rich-select.ts:3` (static import), `_startAutoUpdate` (lines 370-374, inline `autoUpdate`), and `_updatePosition` (lines 452-463, inline `computePosition` with `offset(4)→flip()→shift({padding:8})→sizeMiddleware`). This stack matches `floating-position.ts:121-127` defaults exactly, so migrate onto a `FloatingPositionController` field with `middleware: (mod) => [mod.size({ apply({rects,elements}) { elements.floating.style.minWidth = \`${rects.reference.width}px\`; } })]`. Delete the inline `_startAutoUpdate`/`_updatePosition`; call `controller.start()` on open (mirroring `select.ts:594`).

---

### `src/components/color-picker/color-picker.ts` (component, request-response) — MODIFIED (loader, NOT controller)

**Analog:** its own inline `_updatePosition` (lines 535-543) — a ONE-SHOT `computePosition` with **NO `autoUpdate`**.

**CRITICAL (Pitfall CP1):** do NOT migrate onto `FloatingPositionController` — the controller always wraps positioning in `autoUpdate` (`floating-position.ts:101-103`), which would add a continuous reposition loop = observable behavior change. Route through `loadFloating()` directly, preserving the one-shot:
```typescript
// REMOVE color-picker.ts:4  import { computePosition, flip, offset, shift } from '@floating-ui/dom';
private async _updatePosition() {
  if (!this._trigger || !this._panel) return;
  const mod = await loadFloating();
  const { x, y } = await mod.computePosition(this._trigger, this._panel, {
    placement: 'bottom-start', strategy: 'fixed',
    middleware: [mod.offset(4), mod.flip(), mod.shift({ padding: 8 })],
  });
  Object.assign(this._panel.style, { left: `${x}px`, top: `${y}px` });
}
```
Prefetch `prefetchFloating()` on trigger intent (D-03).

---

### `src/components/data-grid/data-grid.ts` (component, transform) — MODIFIED

**Analog:** combobox `_renderOptionList` swap (lines 717-733).

**Current site:** `data-grid.ts:516` calls `virtualize({ items: sorted, keyFunction, renderItem })` UNCONDITIONALLY inside `render()`. Apply the D-05 swap: `this._virtualize ? this._virtualize({...}) : repeat(sorted, keyFn, renderItem)`, with `loadVirtualizer().then(m => { this._virtualize = m.virtualize; this.requestUpdate(); })` prefetched near threshold / on grid mount. Keep the existing `keyFunction`/`renderItem` bodies (lines 517-524) byte-identical — the ARIA helpers compute from absolute index, identical across both paths (`virtualize-support.ts:73-94`).

---

### `src/components/dropdown/dropdown.ts` — UNCHANGED (verify only)

`dropdown.ts:3` imports only `type Placement` (type-only, erased at build). D-07: no runtime change. Verify it stays type-only after the refactor.

---

### `.size-limit.json` (config, batch) — MODIFIED

**Analog:** its own existing entries. Per RESEARCH Open Question 1 / Assumption A2, `full bundle` (line: `dist/amris.js`) is the only measured entry that carries floating-ui synchronously today; `button`/`data-grid` deep-imports don't import it. Add a **report-only overlay deep-import entry** (e.g. `dist/components/popover/index.js` or `select`) so the SIZE-01 "positioning absent from non-overlay entries" delta is legible. Mirror the existing entry shape (`name`/`path`/`ignore: ["lit"]`/`limit`). Stays report-only until Phase 11.

---

## No Analog Found

None. Every file has an in-repo analog. The loader idiom in `lazy-load.ts` is the only genuinely new code, and RESEARCH.md:280-293 provides the exact shape; its file-level conventions (internal-helper JSDoc, no CEM, keep deps external) mirror `virtualize-support.ts`.

## Key Patterns Identified

- **All floating-ui runtime symbols move behind `loadFloating()`; middleware options become module-receiving getters** so no host holds a static `import { size/arrow }`.
- **`repeat()` is the universal fallback + cold-render path for `virtualize()`**, swapped in via `requestUpdate()` on chunk resolve (D-05) — combobox `_renderOptionList` is the reference implementation.
- **color-picker is the one exception** — one-shot positioning routes through the loader directly, NOT the controller (avoids adding `autoUpdate`).
- **Verification reuses existing report-only harnesses** (`assert-no-bundled-lit.mjs` helpers, frozen `external` snapshot) — nothing enforcing flips this phase.

## Metadata

**Analog search scope:** `src/internal/controllers/`, `src/internal/helpers/`, `src/components/{combobox,select,popover,tooltip,color-picker,rich-select,dropdown,data-grid}/`, `scripts/`, `test/`, `.size-limit.json`, `vite.config.ts`
**Files scanned:** 13
**Pattern extraction date:** 2026-08-22
</content>
</invoke>
