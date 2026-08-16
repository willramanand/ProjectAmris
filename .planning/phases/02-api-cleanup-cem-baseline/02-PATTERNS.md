# Phase 2: API Cleanup + CEM Baseline - Pattern Map

**Mapped:** 2026-08-13
**Files analyzed:** 14 (5 new, 9 modified)
**Analogs found:** 12 / 14 (2 greenfield — no `ReactiveController` or `src/internal/` exists yet)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/internal/controllers/floating-position.ts` | controller (NEW) | event-driven (position lifecycle) | inline `_startAutoUpdate`/`_updatePosition` in `dropdown.ts`, `combobox.ts`, `popover.ts` | greenfield — extract from real duplication |
| `src/internal/controllers/listbox-nav.ts` | controller (NEW) | event-driven (keyboard) | inline `_handleKeydown` in `combobox.ts:442-489` | greenfield — extract |
| `src/internal/controllers/option-filter.ts` | controller/helper (NEW) | transform (filter) | inline filter in `combobox.ts:443-445` | greenfield — extract |
| `src/components/combobox/combobox.ts` | component (MOD) | request-response + event | itself (relocate to controllers) | exact (self-refactor) |
| `src/components/select/select.ts` | component (MOD) | request-response + event | `combobox.ts` structure | role-match |
| `src/components/date-picker/date-picker.ts` | component (MOD) | request-response + event | `combobox.ts` (floating) + pure date helper | role-match |
| `src/components/time-picker/time-picker.ts` | component (MOD) | request-response + event | pure helper split (NO floating-ui) | partial — no positioning |
| `scripts/cem-diff.mjs` | tooling script (NEW) | file-I/O + transform | `scripts/build-tokens-css.mjs` | role-match (.mjs Node script) |
| `scripts/build-audit.mjs` (optional) | tooling script (NEW) | file-I/O + transform | `scripts/build-tokens-css.mjs` | role-match |
| `test/cem-diff.test.ts` (recommended) | test (NEW) | request-response | `test/components/*.test.ts` | role-match |
| `.github/workflows/ci.yml` | config (MOD) | batch/CI | existing `verify` job (ci.yml:14-33) | exact (mirror job shape) |
| `api/custom-elements.baseline.json` | data snapshot (NEW) | file-I/O | `dist/custom-elements.json` (cem output) | exact (verbatim snapshot) |
| `api/AUDIT.md` | doc (NEW) | — | derived from CEM + grep matrices | no analog (new artifact) |
| Event-rename edits (dropdown/popover/context-menu/select/data-grid) | component (MOD) | event-driven | current `new CustomEvent('am-...')` call sites | exact (in-place string rename) |

## Pattern Assignments

### `src/internal/controllers/floating-position.ts` (controller, NEW)

**Analog:** duplicated inline across 9 overlay components. Canonical shape from `src/components/dropdown/dropdown.ts` (cleanest example).

**Existing duplication to consolidate** (`dropdown.ts:105-138`):
```typescript
protected updated(changed: Map<string, unknown>) {
  if (changed.has('open')) {
    if (this.open) {
      this._attachGlobalListeners();
      this._startAutoUpdate();
      this.dispatchEvent(new CustomEvent('am-show', ...));   // event stays in host
    } else {
      this._detachGlobalListeners();
      this._cleanupAutoUpdate?.();
      this._cleanupAutoUpdate = null;
      this.dispatchEvent(new CustomEvent('am-hide', ...));
    }
  }
}
private _startAutoUpdate() {
  this._cleanupAutoUpdate?.();
  const trigger = this.firstElementChild as HTMLElement;
  if (!trigger || !this._panel) return;
  this._cleanupAutoUpdate = autoUpdate(trigger, this._panel, () => this._updatePosition());
}
private async _updatePosition() {
  const trigger = this.firstElementChild as HTMLElement;
  if (!trigger || !this._panel) return;
  const { x, y } = await computePosition(trigger, this._panel, {
    placement: this.placement,
    strategy: 'fixed',
    middleware: [offset(this.offset), flip(), shift({ padding: 8 })],
  });
  Object.assign(this._panel.style, { left: `${x}px`, top: `${y}px` });
}
```

**Same shape in combobox** (`combobox.ts:393-398`) — note reference is `.wrapper`, `strategy` omitted, and combobox adds `size` middleware (`combobox.ts:5` imports `size as sizeMiddleware`). The controller must accept per-host options: `reference()`, `floating()`, `placement`, `strategy`, `offset`, and optional extra middleware — because reference element, strategy, and middleware set differ per component.

**Teardown pattern to mirror in `hostDisconnected()`** (`combobox.ts:365-370`):
```typescript
disconnectedCallback() {
  super.disconnectedCallback();
  document.removeEventListener('click', this._handleDocumentClick);
  this._cleanupAutoUpdate?.();
  this._cleanupAutoUpdate = null;
}
```

**Imports pattern** (from `combobox.ts:1-7` — relative `.js` extensions, `import type` for types):
```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { computePosition, autoUpdate, flip, shift, offset } from '@floating-ui/dom';
```

**CRITICAL behavior-preservation (D-10):** keep `autoUpdate` UNGATED. Do NOT add `if (open)` gating — that is PERF-04/Phase 4. Relocate byte-for-byte. `dropdown.ts` uses `strategy: 'fixed'`; `combobox.ts` omits strategy — preserve each host's exact options, do not unify the runtime behavior.

---

### `src/internal/controllers/listbox-nav.ts` (controller, NEW)

**Analog:** `src/components/combobox/combobox.ts:442-489` (`_handleKeydown`).

**Core pattern to extract** (Arrow/Enter/Escape/Tab + `_highlightedIndex` movement):
```typescript
case 'ArrowDown':
  e.preventDefault();
  if (!this._open) this._open = true;
  this._highlightedIndex = Math.min(this._highlightedIndex + 1, filtered.length - 1);
  break;
case 'ArrowUp':
  e.preventDefault();
  this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
  break;
case 'Escape':
  if (this._open) { e.preventDefault(); this._open = false; this._highlightedIndex = -1; }
  break;
```

**CRITICAL behavior-preservation:** the `_highlightedIndex` is currently NOT re-clamped when `options` are replaced (FIX-02/Phase 3). Preserve this un-clamp-on-replace bug exactly — do not "fix" it while extracting. Enter also branches to `requestAssociatedFormSubmit` (`combobox.ts:468`) — that host-specific concern stays inline or is passed as a callback, not absorbed into the controller.

---

### `src/internal/controllers/option-filter.ts` (controller OR pure helper, NEW)

**Analog:** `src/components/combobox/combobox.ts:443-445`.

**Core pattern:**
```typescript
const filtered = this.async
  ? this._allOptions
  : this._allOptions.filter(o => o.toLowerCase().includes(this.value.toLowerCase()));
```

**Discretion (D-07):** this is nearly pure logic — a plain module may be a better fit than a controller. The async-gating branch (`this.async`) is the only stateful concern. Let the real call sites decide.

---

### `src/components/{combobox,select,date-picker}/*.ts` (component, MOD — floating consumers)

**Analog:** self (behavior-preserving relocation). Consume the three controllers via `host.addController` in the field initializer, delegate in `updated()`. Keep the `new CustomEvent` dispatches in the host (events are public surface; controllers register no element).

**time-picker is different:** `src/components/time-picker/time-picker.ts` has NO `@floating-ui/dom` import [VERIFIED grep]. Its 627 lines are time-list generation / value parsing / keyboard nav. Split via a pure time-list/parse helper module + (if it has a listbox) reuse `listbox-nav.ts`. Do NOT force `floating-position.ts` onto it.

---

### `scripts/cem-diff.mjs` (tooling, NEW)

**Analog:** `scripts/build-tokens-css.mjs` (the only existing `.mjs` Node script).

**Imports/structure pattern to mirror** (`build-tokens-css.mjs:3-8`):
```javascript
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
```
Follow its conventions: `node:fs` imports, top-level script (no wrapper fn required), `console.log` status line at the end. See RESEARCH.md:405-434 for the comparator skeleton (index by `tagName`, sort arrays by `name`, strip `source`, `process.exit(0)` report-only).

---

### `.github/workflows/ci.yml` (config, MOD)

**Analog:** existing `verify` job (`ci.yml:14-33`) — mirror its checkout + setup-node@v4 (Node 20, cache npm) + `npm ci` shape.

**Job to add** (report-only `surface-diff`):
```yaml
  surface-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Build manifest
        run: npm run build:manifest
      - name: Surface diff (report-only)
        run: node scripts/cem-diff.mjs api/custom-elements.baseline.json dist/custom-elements.json
```
Keep the workflow-level `permissions: contents: read` (ci.yml:10-11). `build:manifest` = `cem analyze --config custom-elements-manifest.config.js` [VERIFIED package.json].

---

### Event-rename edits (component, MOD — atomic per wave)

Each rename touches (a) `new CustomEvent('old')` string, (b) `@fires old` JSDoc, (c) test assertions, together in one wave (D-04 hard rename, no alias).

**Wave: overlay lifecycle `am-show`/`am-hide` → `am-open`/`am-close`:**

| File:line (call site) | JSDoc | Test assertions |
|-----------------------|-------|-----------------|
| `dropdown.ts:110` `am-show`, `:115` `am-hide` | `dropdown.ts:17-18` | `test/components/dropdown.test.ts:7,17,25,35` |
| `popover.ts:159` `am-show`, `:164` `am-hide` | `popover.ts:16-17` | `test/components/popover.test.ts:7,17,25,35` |
| `context-menu.ts:115` `am-show`, `:122,:129` `am-hide` | `context-menu.ts:16-17` | `test/components/context-menu.test.ts:34,38,45,51` |

Already-correct majority (do NOT touch): dialog `am-open`/`am-close`, drawer, command-palette `am-close`, toast `am-close`, alert `am-close`.

**Wave: selection events (D-02):**

| File:line | Current | Target | Detail shape / notes |
|-----------|---------|--------|----------------------|
| `select.ts:111` | `am-select-option` (detail `{ value }`, `composed: false`) | `am-change` | preserve `composed: false`; JSDoc at `select.ts:146-147` documents `input`/`change` (add `am-change`); tests `test/components/select.test.ts:7,14,36` |
| `data-grid.ts:245` | `am-row-select` (detail `{ row, index, id, selected, keys }`) | reconcile under `am-change` | JSDoc `data-grid.ts:42` |
| `data-grid.ts:249` | `am-selection-change` (detail `{ keys }`) | reconcile under `am-change` | tests `test/components/data-grid.test.ts:91,95,97,164` |

**Discretion (D-02, A1/Open Q1):** data-grid currently fires BOTH per-row and aggregate events. Decide the single `am-change` `detail` shape (the aggregate `{ keys }` set is the natural value-change payload) from the live component API during the audit; document in the wave's Changeset.

Keep already-canonical `am-select` (menu, list, tree-view, command-palette) unchanged.

**Done-condition per wave:** `grep -rn "am-show\|am-hide\|am-select-option\|am-row-select\|am-selection-change" src test` returns zero for the renamed strings (D-04).

---

## Shared Patterns

### Import conventions
**Source:** `src/components/combobox/combobox.ts:1-7`
**Apply to:** all new controllers + modified components
```typescript
import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
// relative paths with explicit .js extension; import type for type-only:
import { resetStyles } from '../../styles/reset.css.js';
```
Controllers: `import type { ReactiveController, ReactiveControllerHost } from 'lit'`. Register via `host.addController(this)` in constructor.

### Non-exported boundary (D-09) — CRITICAL
**Source:** `package.json` (`files: ["dist","README.md"]`, `exports` has no internal path)
**Apply to:** `src/internal/**` and `api/**`
- Never add `src/internal/` to `src/index.ts`, `src/index.all.ts`, or `package.json` `exports`.
- Keep `api/` out of `package.json` `files` so it stays unpublished (D-12).
- Confirm CEM `tagName` count stays constant after each wave (controllers register no element).

### Teardown mirroring
**Source:** `combobox.ts:365-370`, `dropdown.ts:113-114`
**Apply to:** every controller — mirror the host's existing `disconnectedCallback` cleanup in `hostDisconnected()`. Relocate, do not change ordering or gating.

### Baseline snapshot mechanism (D-14)
**Source:** `dist/custom-elements.json` (output of `npm run build:manifest`)
**Apply to:** `api/custom-elements.baseline.json` — verbatim snapshot, re-committed after each approved normalization wave so the CI diff flags only unintended drift.

### Frozen token surface (API-04, D-11)
**Source:** `src/tokens/{primitives,semantic,dark}.css.ts` + per-component `@cssprop` JSDoc, aggregated via CEM `cssProperties`/`cssParts`/`slots`.
**Apply to:** `api/AUDIT.md` frozen-surface enumeration. Same manifest pass that emits the audit matrices. Flag undocumented-but-used tokens (invisible to CEM) as a gap.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `api/AUDIT.md` | doc | — | New human-reviewable dimension-matrix artifact; no prior markdown matrix in repo. Generate from CEM + `new CustomEvent` grep. |
| `src/internal/controllers/*` (as a `ReactiveController`) | controller | event-driven | No `ReactiveController` and no `src/internal/` exist today [VERIFIED grep]. Greenfield boundary — the "analog" is the inline duplication being consolidated (excerpted above), plus the Lit interface (RESEARCH.md:182-217). |

## Metadata

**Analog search scope:** `src/components/{combobox,dropdown,popover,context-menu,select,data-grid,date-picker,time-picker}/`, `scripts/`, `.github/workflows/`, `test/components/`, `src/tokens/`, `package.json`
**Files scanned:** ~15 (targeted reads + grep across src/test)
**Pattern extraction date:** 2026-08-13
</content>
</invoke>
