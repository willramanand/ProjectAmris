# Phase 4: Performance & Feature Capabilities - Pattern Map

**Mapped:** 2026-08-18
**Files analyzed:** 12 groups (2 new internal modules, 1 new element, field + 15 controls, command-palette, 3 virtualization targets, overlays, package/build, tests)
**Analogs found:** 11 / 12 (virtualized div-grid render has no direct in-repo analog — RESEARCH Pattern 3 governs)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/internal/controllers/validation.ts` (NEW) | controller (ReactiveController) | event-driven (blur/submit → ARIA) | `src/internal/controllers/floating-position.ts` | exact (ReactiveController shape) |
| `src/internal/controllers/shortcut-registry.ts` (NEW) | service/registry (plain class) | event-driven (keydown dispatch) | `src/internal/controllers/listbox-nav.ts` (callback class) + `src/internal/helpers/teardown-scope.ts` (listener lifecycle) | role-match |
| `src/internal/helpers/virtualize-support.ts` (NEW, optional) | utility | transform (threshold + aria helpers) | `src/internal/helpers/teardown-scope.ts` | role-match (helper module shape) |
| `src/components/shortcuts/shortcuts.ts` + `index.ts` (NEW) | provider element (public) | pub-sub (@lit/context distribution) | `src/components/theme-provider/theme-provider.ts` | role-match (thin provider element) |
| `src/components/field/field.ts` (MODIFIED) | component (structural) | event-driven (hint↔error swap) | itself (extend) | self |
| `src/components/input/input.ts` + 14 controls (MODIFIED) | component (form-associated) | request-response (form + validity) | `src/components/input/input.ts` | exact (canonical control) |
| `src/components/command-palette/command-palette.ts` (MODIFIED) | component (overlay) | event-driven (keydown) | itself (refactor) + `am-shortcuts` consumer | self |
| `src/components/data-grid/data-grid.ts` (MODIFIED) | component (data display) | streaming/windowed | RESEARCH Pattern 3 (no in-repo analog) | no analog |
| `src/components/combobox/combobox.ts` (MODIFIED) | component (form + overlay) | streaming/windowed | `src/components/combobox/combobox.ts` (repeat path) | self (extend) |
| `src/components/select/select.ts` (MODIFIED) | component (form + overlay) | streaming/windowed | `src/components/combobox/combobox.ts` | role-match |
| overlay components (popover/tooltip/dropdown/date-picker/context-menu) (MODIFIED) | component (overlay) | event-driven (open transition) | `src/components/combobox/combobox.ts:429-437` (gated) vs `src/components/popover/popover.ts:154-174` (inline, migrate) | exact |
| `package.json` + `vite.config.ts` (MODIFIED) | config | — | `vite.config.ts:195` external list | exact |

## Pattern Assignments

### `src/internal/controllers/validation.ts` (NEW — ReactiveController)

**Analog:** `src/internal/controllers/floating-position.ts` (ReactiveController + accessor-callback options pattern). Also see `listbox-nav.ts` for the host-state-via-callback discipline.

**ReactiveController skeleton to copy** (`floating-position.ts:51-80`):
```ts
export class FloatingPositionController implements ReactiveController {
  private _cleanup: (() => void) | null = null;
  private opts: FloatingPositionOptions;
  constructor(host: ReactiveControllerHost & HTMLElement, opts: FloatingPositionOptions) {
    this.opts = opts;
    host.addController(this);   // register on host
  }
  hostDisconnected(): void { this.stop(); }   // teardown mirror
}
```

**Accessor-callback options pattern to copy** (`floating-position.ts:23-36`, `listbox-nav.ts:12-31`): options are `() => T` accessor callbacks so the controller reads/writes host Shadow-DOM nodes and host `@state` lazily rather than eagerly capturing. Mirror this for `{ internals: () => ElementInternals, anchor: () => HTMLElement, describedById: string }` (RESEARCH Pattern 1, A6). Host keeps ownership of `@state`/`invalid` — controller only orchestrates.

**Same-root ARIA target:** The SR message must render inside the control's own shadow root next to the inner focusable (`input.ts:318-337`), NOT into `am-field`'s light DOM (Pitfall 3). `setCustomError` is NEW public surface (D-03) — surface it via a control facade method, capture in CEM + Changeset.

**`invalid` reflection already exists on controls** (`input.ts:47`): `@property({ type: Boolean, reflect: true }) invalid = false;` → `:host([invalid])`. Reuse it; do NOT depend on `:state()` (Safari 16.4 floor, Pitfall 5).

---

### `src/internal/controllers/shortcut-registry.ts` (NEW — plain class)

**Analog:** `src/internal/controllers/listbox-nav.ts` (plain callback-driven class, `handleKeydown(e)` method) for the dispatch shape; `src/internal/helpers/teardown-scope.ts` for the document-keydown listener lifecycle.

**Keydown-dispatch method shape to copy** (`listbox-nav.ts:57-99`): a single `handleKeydown(e: KeyboardEvent)` switch that mutates via callbacks and calls `e.preventDefault()` selectively. The registry's document listener resolves `e.composedPath()[0]` (Pitfall 4) before dispatch.

**Listener lifecycle to copy** (`teardown-scope.ts:41-56`): attach the document keydown with `{ signal: scope.signal }` and call `scope.clear()` on disconnect:
```ts
get signal(): AbortSignal { return this._controller.signal; }
clear(): void { /* cancels timers + this._controller.abort(); new AbortController(); */ }
```

**No-throw contract (D-11):** `register()` returns `{ ok: false; reason: 'conflict' | 'reserved' }` — never throws (mirrors the behavior-preserving, non-throwing discipline documented in `listbox-nav.ts:33-43`). Registry is an explicit instance (no module singleton, D-08).

**Doc-comment freeze note to copy** (`floating-position.ts:44-49`, `teardown-scope.ts:5-8`): every `src/internal/` file states "registers no custom element, never appears on the frozen CEM/public surface." Reuse this framing; registry machinery stays non-exported while `am-shortcuts` is public.

---

### `src/components/shortcuts/shortcuts.ts` (NEW — public provider element)

**Analog:** `src/components/theme-provider/theme-provider.ts` — a thin, exported provider element that wraps a subtree.

**Element skeleton to copy** (`theme-provider.ts:22-70`):
```ts
@customElement('am-theme-provider')
export class AmThemeProvider extends LitElement {
  static styles = [ /* ... */ css`:host { display: contents; }` ];
  render() { return html`<slot></slot>`; }
}
declare global {
  interface HTMLElementTagNameMap { 'am-theme-provider': AmThemeProvider; }
}
```
Use `:host { display: contents; }` (provider is structural, adds no box). `am-shortcuts` adds `ContextProvider` + a `TeardownScope`-bound document keydown (RESEARCH Code Examples, lines 374-383).

**Barrel export pattern** (`src/components/field/index.ts`): `export * from './shortcuts.js';` and add to `src/index.ts` + `src/index.all.ts` next to `AmThemeProvider` (`src/index.ts:14-15`). This is the one net-new registered tag; it MUST be exported (public) and captured in the CEM baseline + Changeset.

**JSDoc requirement:** Follow the `@slot`/`@fires`/`@csspart`/`@example` block convention (see `input.ts:9-32`, `field.ts:5-26`) so CEM captures the new public surface.

---

### `src/components/input/input.ts` + 14 form-associated controls (MODIFIED)

**Analog:** `input.ts` is the canonical form-associated control; the other 14 mirror its shape.

**ElementInternals attach (already present, extend)** (`input.ts:35, 56-61, 245-249`):
```ts
static formAssociated = true;
private internals: ElementInternals;
constructor() { super(); this.internals = this.attachInternals(); }
protected updated(changed: PropertyValues) {
  if (changed.has('value')) { this.internals.setFormValue(this.value); }
}
```
Add `this.internals.setValidity(...)` + `ValidationController` wiring here (none of the 15 call `setValidity` yet).

**Blur/focus hooks for D-01 timing** (`input.ts:260-261`): `_handleFocus`/`_handleBlur` already exist — hook `markTouched()` into `_handleBlur` and form-submit.

**aria-invalid already wired on inner input** (`input.ts:331`): `aria-invalid=${this.invalid ? 'true' : nothing}` — extend to add `aria-describedby` pointing at a same-root message id (Pitfall 3).

**Controls to wire (15):** input, textarea, checkbox, radio, switch, select, combobox, rich-select, number-field, input-otp, slider, color-picker, date-picker, time-picker. **Exclude** `am-search-field` and `am-file-upload` (NOT form-associated).

**Error styling tokens** (`input.ts:95-100, 191-193`): reuse existing `--am-danger` token; `.wrapper.invalid { border-color: var(--am-danger); }` — no hardcoded colors.

---

### `src/components/command-palette/command-palette.ts` (MODIFIED — D-09 refactor)

**Analog:** itself + the `am-shortcuts` ContextConsumer.

**Current hardcoded fallback to preserve** (`command-palette.ts:206-214, 240-245`):
```ts
connectedCallback() { super.connectedCallback();
  document.addEventListener('keydown', this._handleGlobalKeydown); }
private _handleGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.open = !this.open; }
};
```
Refactor per RESEARCH lines 388-399: add a `ContextConsumer`; when a provider is present, `registry.register({ id: 'command-palette.open', keys: 'mod+k', handler })` and drop the document listener; when absent, keep the existing `_handleGlobalKeydown` fallback verbatim. `mod+k` normalizes `metaKey||ctrlKey` — matches today's UX.

---

### `src/components/combobox/combobox.ts` / `select/select.ts` (MODIFIED — PERF-03)

**Analog:** the existing `repeat()` listbox render in `combobox.ts:611-626` (and select-mode `:678-694`).

**Current repeat path to gate behind threshold** (`combobox.ts:611-625`):
```ts
<div class="listbox ..." role="listbox" ...>
  ${repeat(filteredOptions, option => option,
    (option, i) => html`<div class="option ${i === this._highlightedIndex ? 'highlighted' : ''}"
      role="option" aria-selected=${this.value === option ? 'true' : 'false'}
      @click=${() => this._selectOption(option)}>${option}</div>`)}
</div>
```
Above the threshold (D-06) swap `repeat()` → `virtualize()` directive (RESEARCH Pattern 3, lines 271-288). **Gap to close:** NO `aria-activedescendant` and NO option `id`s today (Pitfall 2) — add stable option ids + `aria-activedescendant`, and `scrollToIndex(target)` BEFORE setting activedescendant. Keep `keyFunction: (opt) => opt` identity keying. Add `aria-setsize`/`aria-posinset` from full-list state, not window.

**Do NOT reintroduce Phase 3 fixes:** `ListboxNavController` deliberately does not re-clamp `_highlightedIndex` on option-list replace (`listbox-nav.ts:38-43`, FIX-02). Preserve it under virtualization.

---

### `src/components/data-grid/data-grid.ts` (MODIFIED — PERF-02)

**Analog:** NONE in-repo for virtualized rendering — RESEARCH Pattern 3 + Pitfall 1 govern.

**Current `<table>`/`repeat()` path** (`data-grid.ts:322-382`): renders semantic `<table role="grid">` with `aria-rowcount=${this.rows.length}` (`:324`) and `repeat()` `<tr role="row">` (`:350-379`) — rows have `role="row"` but NO `aria-rowindex` today.

**Threshold-gated div-grid path (Pitfall 1):** native `<table>`/`<tbody>` layout is incompatible with the virtualizer's absolute/transform positioning. Above the threshold, render a **div-based grid** (`role="grid"/"row"/"gridcell"/"columnheader"`) — ARIA roles already present transfer. ADD per-row `aria-rowindex` (1-based incl. header offset). Keep `aria-rowcount` from `this.rows.length` (full total). Keep selection/sort/focus identity-keyed via `getRowId` (`:352, 355`), driven by state (`_selectionSet`/`_focusedRowIndex`), never row presence.

---

### Overlay components (MODIFIED — PERF-04 autoUpdate gating audit)

**Good analog (already gated, keep):** `combobox.ts:429-437` — starts/stops the shared controller inside `if (changed.has('_open'))`:
```ts
if (changed.has('_open')) {
  if (this._open) { ...; this._floatingController.start(); }
  else { ...; this._floatingController.stop(); }
}
```

**Migration candidate:** `popover.ts:154-174` still uses INLINE `autoUpdate` inside `if (changed.has('open'))` with a manual `_cleanupAutoUpdate`. Behavior is already open-gated, but migrate onto `FloatingPositionController` (`floating-position.ts:61-80` `start()/stop()`/`hostDisconnected()`) for consistency. Audit all consumers: combobox, select, dropdown, popover, tooltip, date-picker, context-menu (INTEGRATIONS.md). Behavior-preserving — no user-facing change.

---

### `package.json` + `vite.config.ts` (MODIFIED — D-12/D-13)

**External-list edit** (`vite.config.ts:195`): add `/^@lit-labs\//` so `@lit-labs/virtualizer` stays external (`@lit/context` already matched by `/^@lit\//`):
```ts
external: ['lit', /^lit\//, /^@lit\//, /^@lit-labs\//, '@floating-ui/dom', /^@floating-ui\//],
```
**package.json:** add to `dependencies` — `@lit-labs/virtualizer` exact-pin `2.1.1`, `@lit/context` caret `^1.1.6` (D-13). Add `am-shortcuts` + `setCustomError` to the CEM baseline (`api/custom-elements.baseline.json`) with a `.changeset/` entry (report-only gate until Phase 6).

## Shared Patterns

### src/internal/ non-exported boundary
**Source:** `floating-position.ts:44-49`, `listbox-nav.ts:33-43`, `teardown-scope.ts:5-8`
**Apply to:** `validation.ts`, `shortcut-registry.ts`, `virtualize-support.ts`
Every internal module: doc-comment stating it registers no custom element / never appears on the frozen CEM surface; imported only by component source; never re-exported from `src/index*.ts`.

### ReactiveController registration
**Source:** `floating-position.ts:55-58`, `listbox-nav.ts:47-50`
**Apply to:** `ValidationController`
```ts
constructor(host: ReactiveControllerHost & HTMLElement, opts: T) { this.opts = opts; host.addController(this); }
hostDisconnected(): void { /* teardown */ }
```

### Accessor-callback options (host keeps state ownership)
**Source:** `floating-position.ts:23-36`, `listbox-nav.ts:12-31`
**Apply to:** `ValidationController`, `ShortcutRegistry`
Options are `() => T` callbacks so controllers read/write host Shadow-DOM nodes and `@state` lazily; host retains ownership of value/selection/validity state.

### Abortable-listener teardown
**Source:** `teardown-scope.ts:41-56`
**Apply to:** `am-shortcuts` document keydown, any new global listener
`addEventListener(type, fn, { signal: scope.signal })` + `scope.clear()` on disconnect.

### `--am-*` tokens for all styling
**Source:** `input.ts:95-100` (`--am-danger`)
**Apply to:** all validation/error styling — no hardcoded colors (dark-mode contract).

### Public-surface JSDoc for CEM capture
**Source:** `input.ts:9-32`, `field.ts:5-26`, `theme-provider.ts:9-31`
**Apply to:** `am-shortcuts`, `setCustomError`, validation ARIA/events — `@slot`/`@fires`/`@csspart`/`@cssprop`/`@example`, `am-*` event prefix.

### Test analogs (lane-correct)
**jsdom-lane logic tests** (`test/internal/teardown-scope.test.ts`): pure logic — copy for `test/internal/shortcut-registry.test.ts` (conflict/blocklist/scope/normalization) and `test/components/validation-controller.test.ts` (D-03 precedence).
**browser-lane tests** (`test/browser/floating-position.test.ts`, `form-association.test.ts`, `overlay-focus.test.ts`): real ElementInternals/ResizeObserver/composedPath — copy for `validation-timing.test.ts`, `validation-aria.test.ts`, `shortcuts-context.test.ts`, `data-grid-virtual.test.ts`, `combobox-virtual.test.ts`. jsdom mocks ElementInternals/ResizeObserver — virtualization/validation/composedPath MUST be browser-lane (RESEARCH §Validation Architecture).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/data-grid/data-grid.ts` virtualized div-grid render path | component | streaming/windowed | No virtualized rendering exists in-repo; native `<table>` path (`data-grid.ts:322-382`) is the code to REPLACE above threshold, not copy. Use RESEARCH Pattern 3 + Pitfall 1. |
| `@lit-labs/virtualizer` `virtualize()` directive usage | — | streaming | New dependency; no prior use. API specifics ASSUMED (RESEARCH A1-A4) — verify against v2.1.1 README at plan time. |
| `@lit/context` provider/consumer wiring | — | pub-sub | New dependency; `theme-provider.ts` gives the element shell but not context wiring. Verify `createContext`/`ContextProvider`/`ContextConsumer` names (A7). |

## Metadata

**Analog search scope:** `src/internal/controllers/`, `src/internal/helpers/`, `src/components/{field,input,theme-provider,command-palette,data-grid,combobox,popover}/`, `test/internal/`, `test/browser/`, `vite.config.ts`, `src/index*.ts`
**Files scanned:** 11 source files read with line cites
**Pattern extraction date:** 2026-08-18
